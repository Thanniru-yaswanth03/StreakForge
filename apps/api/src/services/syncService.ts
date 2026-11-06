import { Types } from 'mongoose';
import { Octokit } from '@octokit/rest';
import { exportSolutionToGitHub } from '@streakforge/sync-engine';
import type { LeetCodeSubmissionInput } from '@streakforge/shared-types';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { Account } from '../models/Account.js';
import { User } from '../models/User.js';
import { decryptToken } from '../utils/crypto.js';
import { logAuditEvent } from './auditService.js';
import { recordDailyActivity } from './streakService.js';
import { logger } from '../utils/logger.js';

export async function processLeetCodeSubmission(
  userId: string,
  input: LeetCodeSubmissionInput
) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // 1. Upsert submission record with duplicate prevention
  let submissionDoc = await LeetCodeSubmission.findOne({
    userId: new Types.ObjectId(userId),
    submissionId: input.submissionId
  });

  if (!submissionDoc) {
    // Check if a submission was recorded for this problem within the last 45 seconds to prevent duplicate rows
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
      await submissionDoc.save();
    }
  }

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
      submittedAt: new Date(input.submittedAt),
      syncStatus: 'PENDING'
    });
    await submissionDoc.save();
  } else if (submissionDoc.syncStatus === 'SYNCED') {
    return {
      submissionId: submissionDoc.submissionId,
      syncStatus: 'SKIPPED',
      message: 'Submission already exported to GitHub',
      commitSha: submissionDoc.githubCommitSha,
      commitUrl: submissionDoc.githubCommitUrl,
      filePath: submissionDoc.filePath
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

    return {
      submissionId: submissionDoc.submissionId,
      syncStatus: 'PENDING',
      message: 'Saved submission. Connect a target GitHub repository to enable automatic commit.'
    };
  }

  // 3. Retrieve decrypted GitHub token
  const account = await Account.findOne({
    userId: new Types.ObjectId(userId),
    provider: 'github'
  });

  if (!account || !account.accessTokenEncrypted) {
    throw new Error('GitHub account credentials not found. Re-authentication required.');
  }

  const rawGitHubToken = decryptToken(account.accessTokenEncrypted);
  const octokit = new Octokit({ auth: rawGitHubToken });

  try {
    const author = {
      name: user.name || user.username,
      email: user.email
    };

    const exportResult = await exportSolutionToGitHub(
      octokit,
      targetRepo.repoFullName,
      targetRepo.defaultBranch || 'main',
      input,
      author,
      targetRepo.solutionPathPattern
    );

    // 4. Update submission document
    submissionDoc.syncStatus = 'SYNCED';
    submissionDoc.githubCommitSha = exportResult.commitSha;
    submissionDoc.githubCommitUrl = exportResult.commitUrl;
    submissionDoc.filePath = exportResult.codeFilePath;
    submissionDoc.syncedAt = new Date();
    submissionDoc.syncErrorMessage = undefined;
    await submissionDoc.save();

    // 5. Update target repo last synced time
    targetRepo.lastSyncedAt = new Date();
    await targetRepo.save();

    // 6. Record daily activity and streak for both LeetCode and the pushed Git commit
    await recordDailyActivity(
      userId,
      'LEETCODE',
      input.language,
      new Date(input.submittedAt)
    );
    await recordDailyActivity(
      userId,
      'GIT_COMMIT',
      exportResult.commitSha,
      new Date()
    );

    // 7. Write immutable audit log
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
        repo: targetRepo.repoFullName
      }
    });

    return {
      submissionId: submissionDoc.submissionId,
      syncStatus: 'SYNCED',
      commitSha: exportResult.commitSha,
      commitUrl: exportResult.commitUrl,
      filePath: exportResult.codeFilePath
    };
  } catch (error: any) {
    const isBadCredentials =
      error.message?.includes('Bad credentials') ||
      error.status === 401 ||
      error.message?.includes('401');

    const cleanErrorMessage = isBadCredentials
      ? 'GitHub authentication expired (Bad credentials). Please reconnect GitHub in Settings.'
      : error.message;

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

    logger.error('Failed to export solution to GitHub', { error });

    if (isBadCredentials) {
      throw new Error('GitHub authentication expired (Bad credentials). Please update your GitHub Personal Access Token (PAT) or reconnect GitHub in Settings.');
    }
    throw error;
  }
}

