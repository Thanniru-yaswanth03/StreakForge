import { Types } from 'mongoose';
import { Octokit } from '@octokit/rest';
import { exportSolutionToGitHub, type SolutionFormattingOptions } from '@streakforge/sync-engine';
import type {
  ExtensionSyncState,
  LeetCodeSubmissionInput,
  SyncDiagnosticsComparison
} from '@streakforge/shared-types';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { JobRecord } from '../models/JobRecord.js';
import { Account } from '../models/Account.js';
import { User, IUserDocument } from '../models/User.js';
import { DailyActivitySnapshot } from '../models/DailyActivitySnapshot.js';
import { decryptToken } from '../utils/crypto.js';
import { logAuditEvent } from './auditService.js';
import { recordDailyActivity, getStreakOverview } from './streakService.js';
import { createNotification } from './notificationService.js';
import {
  verifyGitHubTokenHealth,
  getDefaultSyncPreferences,
  getDefaultUiPreferences,
  formatUserResponse
} from './authService.js';
import { invalidateGitHubActivityCache } from './githubService.js';
import { fetchPublicRecentAcSubmissions } from './leetcodeService.js';
import { logger } from '../utils/logger.js';

export interface ProcessSubmissionOptions {
  forceExport?: boolean;
  importSource?: 'LIVE_EXTENSION' | 'HISTORY_IMPORT' | 'PUBLIC_API';
}

function buildFormattingOptions(
  user: IUserDocument,
  targetPattern?: string,
  topicTags?: string[]
): SolutionFormattingOptions {
  const prefs = {
    ...getDefaultSyncPreferences(),
    ...(user.syncPreferences || {})
  };
  return {
    folderPattern: prefs.folderPattern || targetPattern || 'solutions/{difficulty}/{id}-{slug}',
    fileNamingPattern: prefs.fileNamingPattern || '{slug}{ext}',
    zeroPadId: prefs.zeroPadId ?? 0,
    includeHeader: prefs.includeHeader ?? true,
    includeMetrics: prefs.includeMetrics ?? true,
    includeReadme: prefs.includeReadme ?? true,
    preserveOriginalCode: prefs.preserveOriginalCode ?? false,
    topicTags
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function processLeetCodeSubmission(
  userId: string,
  input: LeetCodeSubmissionInput,
  options: ProcessSubmissionOptions = {}
) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const syncPrefs = {
    ...getDefaultSyncPreferences(),
    ...(user.syncPreferences || {})
  };
  const notifPrefs = user.notificationPreferences || ({} as any);

  // 1. Upsert submission record with duplicate prevention
  let submissionDoc = await LeetCodeSubmission.findOne({
    userId: new Types.ObjectId(userId),
    submissionId: input.submissionId
  });

  if (!submissionDoc) {
    // Prevent duplicate rows for fast repeat events on the same problem within 45 seconds
    const recentWindow = new Date(Date.now() - 45000);
    submissionDoc = await LeetCodeSubmission.findOne({
      userId: new Types.ObjectId(userId),
      questionSlug: input.questionSlug,
      createdAt: { $gte: recentWindow }
    });

    if (submissionDoc) {
      submissionDoc.submissionId = input.submissionId;
      submissionDoc.language = input.language;
      submissionDoc.code = input.code;
      submissionDoc.runtimeMs = input.runtimeMs;
      submissionDoc.runtimePercentile = input.runtimePercentile;
      submissionDoc.memoryBytes = input.memoryBytes;
      submissionDoc.memoryPercentile = input.memoryPercentile;
      if (input.topicTags?.length) submissionDoc.topicTags = input.topicTags;
      if (input.problemUrl) submissionDoc.problemUrl = input.problemUrl;
      await submissionDoc.save();
    }
  }

  const isBrandNewRecord = !submissionDoc;
  if (!submissionDoc) {
    submissionDoc = new LeetCodeSubmission({
      userId: new Types.ObjectId(userId),
      submissionId: input.submissionId,
      questionId: input.questionId,
      questionTitle: input.questionTitle,
      questionSlug: input.questionSlug,
      difficulty: input.difficulty,
      language: input.language,
      code: input.code,
      runtimeMs: input.runtimeMs,
      runtimePercentile: input.runtimePercentile,
      memoryBytes: input.memoryBytes,
      memoryPercentile: input.memoryPercentile,
      topicTags: input.topicTags || [],
      problemUrl:
        input.problemUrl || `https://leetcode.com/problems/${input.questionSlug}/`,
      submittedAt: new Date(input.submittedAt),
      importSource: options.importSource || 'LIVE_EXTENSION',
      syncStatus: 'PENDING'
    });
    await submissionDoc.save();

    // Always record authentic solved day activity immediately upon accepted detection
    await recordDailyActivity(
      userId,
      'LEETCODE',
      input.language,
      new Date(input.submittedAt)
    ).catch((err) => logger.warn('Failed recording daily LeetCode activity', { err }));
  } else if (submissionDoc.syncStatus === 'SYNCED' && !options.forceExport) {
    return {
      id: submissionDoc._id?.toString?.() || submissionDoc.submissionId,
      submissionId: submissionDoc.submissionId,
      syncStatus: 'SKIPPED' as const,
      alreadySynced: true,
      message: 'Submission already exported to GitHub',
      commitSha: submissionDoc.githubCommitSha,
      commitUrl: submissionDoc.githubCommitUrl,
      filePath: submissionDoc.filePath
    };
  }

  // Check NEW_ONLY export policy when problem already has an exported submission
  if (!options.forceExport && syncPrefs.exportPolicy === 'NEW_ONLY') {
    const previouslyExported = await LeetCodeSubmission.exists({
      userId: new Types.ObjectId(userId),
      questionSlug: input.questionSlug,
      syncStatus: 'SYNCED',
      _id: { $ne: submissionDoc._id }
    });
    if (previouslyExported) {
      submissionDoc.syncStatus = 'SKIPPED';
      submissionDoc.syncErrorMessage =
        'Skipped per "New problems only" export policy (problem already exported to GitHub).';
      await submissionDoc.save();
      return {
        id: submissionDoc._id.toString(),
        submissionId: submissionDoc.submissionId,
        syncStatus: 'SKIPPED' as const,
        message: submissionDoc.syncErrorMessage
      };
    }
  }

  // Respect manual commit mode / disabled auto-sync when not explicitly retried/forced
  if (!options.forceExport && (!syncPrefs.autoSyncEnabled || !syncPrefs.autoCommit)) {
    submissionDoc.syncStatus = 'PENDING';
    submissionDoc.syncErrorMessage = !syncPrefs.autoSyncEnabled
      ? 'Auto-sync disabled in user settings. Use manual Push / Retry to export.'
      : 'Auto-commit disabled (manual approval mode). Click Retry/Push to commit to GitHub.';
    await submissionDoc.save();

    if (isBrandNewRecord && notifPrefs.inApp !== false && notifPrefs.problemSolved !== false) {
      await createNotification({
        userId,
        category: 'PENDING_APPROVAL',
        severity: 'INFO',
        title: `Solved: ${input.questionId}. ${input.questionTitle}`,
        message: submissionDoc.syncErrorMessage,
        metadata: { submissionId: submissionDoc.submissionId, questionSlug: input.questionSlug }
      }).catch(() => {});
    }

    return {
      id: submissionDoc._id.toString(),
      submissionId: submissionDoc.submissionId,
      syncStatus: 'PENDING' as const,
      message: submissionDoc.syncErrorMessage
    };
  }

  // 2. Locate target repository
  const targetRepo = await RepositoryConnection.findOne({
    userId: new Types.ObjectId(userId),
    isTargetForLeetCode: true
  });

  if (!targetRepo) {
    submissionDoc.syncStatus = 'PENDING';
    submissionDoc.syncErrorMessage = 'No target GitHub repository selected for export';
    await submissionDoc.save();

    await logAuditEvent({
      userId,
      component: 'EXTENSION',
      action: 'LEETCODE_EXPORT_QUEUED',
      status: 'WARNING',
      description: `Submission for ${input.questionTitle} saved. Waiting for target repo connection.`
    });

    if (notifPrefs.inApp !== false && notifPrefs.problemSolved !== false) {
      await createNotification({
        userId,
        category: 'PENDING_APPROVAL',
        severity: 'WARNING',
        title: `Pending Repo Selection: ${input.questionTitle}`,
        message: 'Solved problem saved locally in StreakForge. Select a target GitHub repository to push code.',
        metadata: { submissionId: submissionDoc.submissionId }
      }).catch(() => {});
    }

    return {
      id: submissionDoc._id.toString(),
      submissionId: submissionDoc.submissionId,
      syncStatus: 'PENDING' as const,
      message: 'Saved submission. Connect a target GitHub repository to enable automatic commit.'
    };
  }

  // 3. Retrieve decrypted GitHub token
  const account = await Account.findOne({
    userId: new Types.ObjectId(userId),
    provider: 'github'
  });

  if (!account || !account.accessTokenEncrypted) {
    submissionDoc.syncStatus = 'FAILED';
    submissionDoc.syncErrorMessage =
      'GitHub account credentials not found. Please reconnect GitHub.';
    await submissionDoc.save();
    throw new Error('GitHub account credentials not found. Re-authentication required.');
  }

  const rawGitHubToken = decryptToken(account.accessTokenEncrypted);
  const octokit = new Octokit({ auth: rawGitHubToken });

  try {
    const author = {
      name: user.name || user.username,
      email: user.email
    };

    const branch = targetRepo.syncPolicy?.branch || targetRepo.defaultBranch || 'main';
    const formatting = buildFormattingOptions(
      user,
      targetRepo.solutionPathPattern,
      input.topicTags
    );

    const exportResult = await exportSolutionToGitHub(
      octokit,
      targetRepo.repoFullName,
      branch,
      input,
      author,
      formatting.folderPattern,
      formatting
    );

    if (!exportResult.commitSha || !exportResult.verified) {
      throw new Error('GitHub commit verification failed: missing verified commit SHA.');
    }

    // 4. Update submission document only AFTER GitHub verification succeeds
    submissionDoc.syncStatus = 'SYNCED';
    submissionDoc.githubCommitSha = exportResult.commitSha;
    submissionDoc.githubCommitUrl = exportResult.commitUrl;
    submissionDoc.targetRepoFullName = targetRepo.repoFullName;
    submissionDoc.targetBranch = branch;
    submissionDoc.filePath = exportResult.codeFilePath;
    submissionDoc.syncedAt = new Date();
    submissionDoc.syncErrorMessage = undefined;
    await submissionDoc.save();

    // 5. Update target repo last synced time & bust cached GitHub activity
    targetRepo.lastSyncedAt = new Date();
    await targetRepo.save();
    invalidateGitHubActivityCache(userId);

    // 6. Record daily Git commit streak
    await recordDailyActivity(userId, 'GIT_COMMIT', exportResult.commitSha, new Date());

    // 7. Write immutable audit log + user notification
    await logAuditEvent({
      userId,
      component: 'API',
      action: 'LEETCODE_EXPORT_SUCCESS',
      status: 'SUCCESS',
      description: `Exported solution for [${input.questionId}] ${input.questionTitle} to ${targetRepo.repoFullName}`,
      metadata: {
        questionId: input.questionId,
        difficulty: input.difficulty,
        commitSha: exportResult.commitSha,
        commitUrl: exportResult.commitUrl,
        repo: targetRepo.repoFullName,
        branch
      }
    });

    if (notifPrefs.inApp !== false && notifPrefs.syncSuccess !== false) {
      await createNotification({
        userId,
        category: 'EXPORT_SUCCESS',
        severity: 'SUCCESS',
        title: `Synced to GitHub: ${input.questionId}. ${input.questionTitle}`,
        message: `Pushed ${exportResult.codeFilePath} to ${targetRepo.repoFullName} (${branch}).`,
        link: exportResult.commitUrl,
        metadata: {
          submissionId: submissionDoc.submissionId,
          commitSha: exportResult.commitSha,
          repo: targetRepo.repoFullName
        }
      }).catch(() => {});
    }

    return {
      id: submissionDoc._id.toString(),
      submissionId: submissionDoc.submissionId,
      syncStatus: 'SYNCED' as const,
      commitSha: exportResult.commitSha,
      commitUrl: exportResult.commitUrl,
      targetRepoFullName: targetRepo.repoFullName,
      targetBranch: branch,
      filePath: exportResult.codeFilePath,
      syncedAt: submissionDoc.syncedAt.toISOString()
    };
  } catch (error: any) {
    const status = error?.status || error?.response?.status;
    const isBadCredentials =
      error.message?.includes('Bad credentials') || status === 401 || error.message?.includes('401');

    const cleanErrorMessage = isBadCredentials
      ? 'GitHub authentication expired or revoked (401). Please reconnect GitHub.'
      : error.message || 'Unknown GitHub API error';

    submissionDoc.syncStatus = 'FAILED';
    submissionDoc.syncErrorMessage = cleanErrorMessage;
    await submissionDoc.save();

    await logAuditEvent({
      userId,
      component: 'API',
      action: 'LEETCODE_EXPORT_FAILED',
      status: 'FAILURE',
      description: `Failed to export solution for [${input.questionId}] ${input.questionTitle}: ${cleanErrorMessage}`,
      metadata: { error: cleanErrorMessage, repo: targetRepo.repoFullName }
    });

    // Enqueue background retry job with 60s delay for transient (non-auth) failures
    if (!isBadCredentials) {
      try {
        const { JobQueueService } = await import('./jobQueueService.js');
        await JobQueueService.enqueueJob(
          userId,
          'LEETCODE_EXPORT',
          {
            submissionDbId: submissionDoc._id.toString(),
            submissionId: submissionDoc.submissionId,
            questionTitle: submissionDoc.questionTitle,
            questionSlug: submissionDoc.questionSlug
          },
          {
            idempotencyKey: `retry-export:${submissionDoc.submissionId}`,
            delaySeconds: 60,
            maxRetries: 3
          }
        );
      } catch (qErr) {
        logger.warn('Failed to enqueue background retry job', { qErr });
      }
    }

    if (notifPrefs.inApp !== false && (notifPrefs.syncFailure !== false || isBadCredentials)) {
      await createNotification({
        userId,
        category: isBadCredentials ? 'AUTH_EXPIRATION' : 'EXPORT_FAILURE',
        severity: 'ERROR',
        title: isBadCredentials
          ? 'GitHub Session Expired'
          : `Sync Failed: ${input.questionId}. ${input.questionTitle}`,
        message: cleanErrorMessage,
        metadata: {
          submissionId: submissionDoc.submissionId,
          repo: targetRepo.repoFullName
        }
      }).catch(() => {});
    }

    logger.error('Failed to export solution to GitHub', { error });

    if (isBadCredentials) {
      throw new Error(
        'GitHub authentication expired (Bad credentials). Please reconnect GitHub.'
      );
    }
    throw error;
  }
}

export interface SubmissionHistoryQuery {
  page?: number;
  limit?: number;
  status?: string;
  difficulty?: string;
  language?: string;
  topic?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sort?: string;
}

export async function getSubmissionHistoryWithMetrics(
  userId: string,
  options: SubmissionHistoryQuery = {}
) {
  const userObjId = new Types.ObjectId(userId);
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));

  const query: Record<string, any> = { userId: userObjId };
  if (options.status && options.status !== 'ALL') query.syncStatus = options.status;
  if (options.difficulty && options.difficulty !== 'ALL') query.difficulty = options.difficulty;
  if (options.language && options.language !== 'ALL') {
    query.language = new RegExp(`^${escapeRegex(options.language)}$`, 'i');
  }
  if (options.topic && options.topic !== 'ALL') {
    query.topicTags = options.topic;
  }
  if (options.fromDate || options.toDate) {
    query.submittedAt = {};
    if (options.fromDate) query.submittedAt.$gte = new Date(options.fromDate);
    if (options.toDate) query.submittedAt.$lte = new Date(options.toDate);
  }
  if (options.search?.trim()) {
    const rx = new RegExp(escapeRegex(options.search.trim()), 'i');
    query.$or = [
      { questionTitle: rx },
      { questionSlug: rx },
      { questionId: rx },
      { language: rx }
    ];
  }

  let sortObj: Record<string, 1 | -1> = { submittedAt: -1 };
  switch (options.sort) {
    case 'oldest':
      sortObj = { submittedAt: 1 };
      break;
    case 'recentlySynced':
      sortObj = { syncedAt: -1, submittedAt: -1 };
      break;
    case 'questionId':
      sortObj = { questionId: 1, submittedAt: -1 };
      break;
    case 'difficulty':
      sortObj = { difficulty: 1, submittedAt: -1 };
      break;
    default:
      sortObj = { submittedAt: -1 };
  }

  const [total, items, metricsAgg, distinctProblems, languages, topics] = await Promise.all([
    LeetCodeSubmission.countDocuments(query),
    LeetCodeSubmission.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit),
    LeetCodeSubmission.aggregate([
      { $match: { userId: userObjId } },
      {
        $group: {
          _id: '$syncStatus',
          count: { $sum: 1 }
        }
      }
    ]),
    LeetCodeSubmission.distinct('questionSlug', { userId: userObjId }),
    LeetCodeSubmission.distinct('language', { userId: userObjId }),
    LeetCodeSubmission.distinct('topicTags', { userId: userObjId })
  ]);

  const statusCounts: Record<string, number> = {
    SYNCED: 0,
    PENDING: 0,
    FAILED: 0,
    SKIPPED: 0
  };
  let acceptedSubmissions = 0;
  for (const row of metricsAgg) {
    statusCounts[row._id] = row.count;
    acceptedSubmissions += row.count;
  }

  const mapped = items.map((doc) => {
    const obj = doc.toObject();
    return {
      ...obj,
      id: doc._id.toString(),
      _id: doc._id.toString()
    };
  });

  return {
    items: mapped,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    },
    metrics: {
      uniqueProblemsSolved: distinctProblems.length,
      acceptedSubmissions,
      exportedCount: statusCounts.SYNCED || 0,
      pendingCount: statusCounts.PENDING || 0,
      failedCount: statusCounts.FAILED || 0,
      skippedCount: statusCounts.SKIPPED || 0
    },
    facets: {
      languages: languages.filter(Boolean).sort(),
      topics: topics.filter(Boolean).sort()
    }
  };
}

export async function importHistoricalSubmissions(
  userId: string,
  submissions: Array<{
    submissionId: string;
    questionId: string;
    questionTitle: string;
    questionSlug: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    language: string;
    code?: string;
    runtimeMs?: number;
    runtimePercentile?: number;
    memoryBytes?: number;
    memoryPercentile?: number;
    submittedAt: string;
    topicTags?: string[];
    problemUrl?: string;
  }>,
  options: {
    autoExportToGitHub?: boolean;
    importSource?: 'HISTORY_IMPORT' | 'PUBLIC_API';
  } = {}
) {
  const userObjId = new Types.ObjectId(userId);
  let importedCount = 0;
  let skippedDuplicates = 0;
  let missingCodeCount = 0;
  let exportedCount = 0;
  const errors: Array<{ submissionId: string; message: string }> = [];

  for (const item of submissions) {
    try {
      const existing = await LeetCodeSubmission.findOne({
        userId: userObjId,
        submissionId: item.submissionId
      });
      if (existing) {
        // Enrich metadata/code if an earlier metadata-only row lacked code and now has code
        if ((!existing.code || existing.code.trim() === '') && item.code && item.code.trim() !== '') {
          existing.code = item.code;
          existing.syncStatus = 'PENDING';
          existing.syncErrorMessage = undefined;
          await existing.save();
          if (options.autoExportToGitHub) {
            const res = await processLeetCodeSubmission(
              userId,
              {
                submissionId: existing.submissionId,
                questionId: existing.questionId,
                questionTitle: existing.questionTitle,
                questionSlug: existing.questionSlug,
                difficulty: existing.difficulty,
                language: existing.language,
                code: existing.code,
                runtimeMs: existing.runtimeMs,
                runtimePercentile: existing.runtimePercentile,
                memoryBytes: existing.memoryBytes,
                memoryPercentile: existing.memoryPercentile,
                submittedAt: existing.submittedAt.toISOString(),
                topicTags: existing.topicTags,
                problemUrl: existing.problemUrl
              },
              { forceExport: true, importSource: options.importSource || 'HISTORY_IMPORT' }
            );
            if (res.syncStatus === 'SYNCED') exportedCount += 1;
          }
          importedCount += 1;
        } else {
          skippedDuplicates += 1;
        }
        continue;
      }

      const hasCode = Boolean(item.code && item.code.trim().length > 0);
      if (!hasCode) {
        missingCodeCount += 1;
        await LeetCodeSubmission.create({
          userId: userObjId,
          submissionId: item.submissionId,
          questionId: item.questionId,
          questionTitle: item.questionTitle,
          questionSlug: item.questionSlug,
          difficulty: item.difficulty || 'Easy',
          language: item.language,
          code: '',
          runtimeMs: item.runtimeMs || 0,
          runtimePercentile: item.runtimePercentile || 0,
          memoryBytes: item.memoryBytes || 0,
          memoryPercentile: item.memoryPercentile || 0,
          topicTags: item.topicTags || [],
          problemUrl: item.problemUrl || `https://leetcode.com/problems/${item.questionSlug}/`,
          submittedAt: new Date(item.submittedAt),
          importSource: options.importSource || 'PUBLIC_API',
          syncStatus: 'SKIPPED',
          syncErrorMessage:
            'Source code not exposed by public LeetCode API. Run Extension Session Import while signed into leetcode.com to fetch and push source code.'
        });
        await recordDailyActivity(
          userId,
          'LEETCODE',
          item.language,
          new Date(item.submittedAt)
        ).catch(() => {});
        importedCount += 1;
        continue;
      }

      if (options.autoExportToGitHub) {
        const res = await processLeetCodeSubmission(
          userId,
          {
            submissionId: item.submissionId,
            questionId: item.questionId,
            questionTitle: item.questionTitle,
            questionSlug: item.questionSlug,
            difficulty: item.difficulty || 'Easy',
            language: item.language,
            code: item.code!,
            runtimeMs: item.runtimeMs || 0,
            runtimePercentile: item.runtimePercentile || 0,
            memoryBytes: item.memoryBytes || 0,
            memoryPercentile: item.memoryPercentile || 0,
            submittedAt: item.submittedAt,
            topicTags: item.topicTags,
            problemUrl: item.problemUrl
          },
          { forceExport: true, importSource: options.importSource || 'HISTORY_IMPORT' }
        );
        if (res.syncStatus === 'SYNCED') exportedCount += 1;
      } else {
        await LeetCodeSubmission.create({
          userId: userObjId,
          submissionId: item.submissionId,
          questionId: item.questionId,
          questionTitle: item.questionTitle,
          questionSlug: item.questionSlug,
          difficulty: item.difficulty || 'Easy',
          language: item.language,
          code: item.code!,
          runtimeMs: item.runtimeMs || 0,
          runtimePercentile: item.runtimePercentile || 0,
          memoryBytes: item.memoryBytes || 0,
          memoryPercentile: item.memoryPercentile || 0,
          topicTags: item.topicTags || [],
          problemUrl: item.problemUrl || `https://leetcode.com/problems/${item.questionSlug}/`,
          submittedAt: new Date(item.submittedAt),
          importSource: options.importSource || 'HISTORY_IMPORT',
          syncStatus: 'PENDING'
        });
        await recordDailyActivity(
          userId,
          'LEETCODE',
          item.language,
          new Date(item.submittedAt)
        ).catch(() => {});
      }

      importedCount += 1;
    } catch (err: any) {
      errors.push({
        submissionId: item.submissionId,
        message: err?.message || 'Import failed'
      });
    }
  }

  return {
    importedCount,
    skippedDuplicates,
    missingCodeCount,
    exportedCount,
    errors
  };
}

export async function importPublicRecentFromLeetCode(
  userId: string,
  usernameOverride?: string
) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  const lcUsername = (usernameOverride || user.leetcodeUsername || '').trim();
  if (!lcUsername) {
    throw new Error('Connect a LeetCode username before running public history import.');
  }
  const items = await fetchPublicRecentAcSubmissions(lcUsername, 20);
  if (items.length === 0) {
    return {
      username: lcUsername,
      importedCount: 0,
      skippedDuplicates: 0,
      missingCodeCount: 0,
      exportedCount: 0,
      errors: []
    };
  }
  const result = await importHistoricalSubmissions(userId, items, {
    autoExportToGitHub: false,
    importSource: 'PUBLIC_API'
  });
  return {
    username: lcUsername,
    ...result
  };
}

export async function getCanonicalSyncState(
  userId: string,
  token?: string
): Promise<ExtensionSyncState> {
  const userObjId = new Types.ObjectId(userId);
  const [user, targetRepo, githubTokenHealth, historyData, streakOverview, lastSynced, queueRows] =
    await Promise.all([
      User.findById(userObjId),
      RepositoryConnection.findOne({ userId: userObjId, isTargetForLeetCode: true }),
      verifyGitHubTokenHealth(userId, false),
      getSubmissionHistoryWithMetrics(userId, { page: 1, limit: 1 }),
      getStreakOverview(userId),
      LeetCodeSubmission.findOne({ userId: userObjId, syncStatus: 'SYNCED' })
        .sort({ syncedAt: -1, submittedAt: -1 }),
      JobRecord.aggregate([
        {
          $match: {
            userId: userObjId,
            status: { $in: ['QUEUED', 'RETRYING', 'FAILED'] }
          }
        },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

  const queueMap: Record<string, number> = {};
  for (const r of queueRows) queueMap[r._id] = r.count;

  const lastSyncedJson = lastSynced
    ? { ...lastSynced.toObject(), id: lastSynced._id.toString() }
    : null;

  return {
    fetchedAt: new Date().toISOString(),
    user: user ? (formatUserResponse(user, githubTokenHealth, token) as any) : null,
    githubTokenHealth,
    targetRepo: targetRepo
      ? ({ ...targetRepo.toObject(), id: targetRepo._id.toString() } as any)
      : null,
    syncPreferences: {
      ...getDefaultSyncPreferences(),
      ...(user?.syncPreferences || {})
    },
    uiPreferences: {
      ...getDefaultUiPreferences(),
      ...(user?.uiPreferences || {})
    },
    metrics: {
      uniqueProblemsSolved: historyData.metrics.uniqueProblemsSolved,
      acceptedSubmissions: historyData.metrics.acceptedSubmissions,
      totalSubmissions: user?.leetcodeStats?.totalSubmissions ?? historyData.metrics.acceptedSubmissions,
      exportedCount: historyData.metrics.exportedCount,
      pendingCount: historyData.metrics.pendingCount,
      failedCount: historyData.metrics.failedCount,
      skippedCount: historyData.metrics.skippedCount
    },
    streak: {
      currentStreak: streakOverview.currentStreak,
      longestStreak: streakOverview.longestStreak
    },
    lastSyncedSubmission: lastSyncedJson as any,
    queueSummary: {
      pending: queueMap.QUEUED || 0,
      retrying: queueMap.RETRYING || 0,
      failed: queueMap.FAILED || 0
    }
  };
}

export async function getSyncDiagnostics(userId: string): Promise<SyncDiagnosticsComparison> {
  const userObjId = new Types.ObjectId(userId);
  const [user, targetRepo, historyData, tokenHealth, lastSynced] = await Promise.all([
    User.findById(userObjId),
    RepositoryConnection.findOne({ userId: userObjId, isTargetForLeetCode: true }),
    getSubmissionHistoryWithMetrics(userId, { page: 1, limit: 1 }),
    verifyGitHubTokenHealth(userId, true),
    LeetCodeSubmission.findOne({ userId: userObjId, syncStatus: 'SYNCED' })
      .sort({ syncedAt: -1 })
  ]);

  let repoDiag: SyncDiagnosticsComparison['targetRepo'] = null;
  const mismatches: string[] = [];

  if (!tokenHealth.valid) {
    mismatches.push(tokenHealth.message || 'GitHub authorization token is invalid or expired.');
  }

  if (!targetRepo) {
    mismatches.push('No target GitHub repository is selected for LeetCode exports.');
  } else {
    const branch = targetRepo.syncPolicy?.branch || targetRepo.defaultBranch || 'main';
    try {
      const account = await Account.findOne({ userId: userObjId, provider: 'github' });
      if (!account?.accessTokenEncrypted) {
        repoDiag = {
          repoFullName: targetRepo.repoFullName,
          branch,
          accessible: false,
          canPush: false,
          error: 'No encrypted GitHub token found'
        };
      } else {
        const octokit = new Octokit({ auth: decryptToken(account.accessTokenEncrypted) });
        const [owner, repo] = targetRepo.repoFullName.split('/');
        const repoRes = await octokit.rest.repos.get({ owner, repo });
        const canPush = Boolean(repoRes.data.permissions?.push || repoRes.data.permissions?.admin);
        repoDiag = {
          repoFullName: targetRepo.repoFullName,
          branch,
          accessible: true,
          canPush,
          error: canPush ? undefined : 'Token lacks write/push permission on repository'
        };
        if (!canPush) {
          mismatches.push(`Missing write permission on target repository ${targetRepo.repoFullName}.`);
        }
      }
    } catch (err: any) {
      repoDiag = {
        repoFullName: targetRepo.repoFullName,
        branch,
        accessible: false,
        canPush: false,
        error: err?.message || 'Unable to verify repository'
      };
      mismatches.push(`Target repository ${targetRepo.repoFullName} could not be accessed.`);
    }
  }

  const profileTotal = user?.leetcodeStats?.totalSolved ?? null;
  if (
    profileTotal !== null &&
    profileTotal > historyData.metrics.uniqueProblemsSolved
  ) {
    mismatches.push(
      `LeetCode profile reports ${profileTotal} solved problems while StreakForge DB has ${historyData.metrics.uniqueProblemsSolved}. Run Historical Import to backfill.`
    );
  }
  if (historyData.metrics.failedCount > 0) {
    mismatches.push(`${historyData.metrics.failedCount} submission export(s) failed and need attention.`);
  }
  if (historyData.metrics.pendingCount > 0) {
    mismatches.push(`${historyData.metrics.pendingCount} submission(s) are pending GitHub push.`);
  }

  return {
    checkedAt: new Date().toISOString(),
    dbMetrics: {
      uniqueProblemsSolved: historyData.metrics.uniqueProblemsSolved,
      acceptedSubmissions: historyData.metrics.acceptedSubmissions,
      exportedCount: historyData.metrics.exportedCount,
      pendingCount: historyData.metrics.pendingCount,
      failedCount: historyData.metrics.failedCount,
      skippedCount: historyData.metrics.skippedCount
    },
    leetcodeProfileTotal: profileTotal,
    targetRepo: repoDiag,
    githubTokenValid: tokenHealth.valid,
    lastSyncedAt: lastSynced?.syncedAt ? lastSynced.syncedAt.toISOString() : null,
    mismatches
  };
}

export async function deleteSubmissionsByIds(userId: string, ids: string[]): Promise<number> {
  const validIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (validIds.length === 0) return 0;

  const res = await LeetCodeSubmission.deleteMany({
    _id: { $in: validIds },
    userId: new Types.ObjectId(userId)
  });

  if (res.deletedCount > 0) {
    // Recalculate DailyActivitySnapshot counts only if requested or leave streak audit intact;
    // explicitly NEVER touch GitHub commits.
    await logAuditEvent({
      userId,
      component: 'API',
      action: 'LEETCODE_SUBMISSIONS_DELETED',
      status: 'WARNING',
      description: `Deleted ${res.deletedCount} submission record(s) from StreakForge database (GitHub repository commits left untouched).`
    });
  }

  return res.deletedCount;
}
