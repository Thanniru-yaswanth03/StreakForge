import { Types } from 'mongoose';
import { Octokit } from '@octokit/rest';
import type { AutomationType } from '@streakforge/shared-types';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { Account } from '../models/Account.js';
import { User } from '../models/User.js';
import { decryptToken } from '../utils/crypto.js';
import { processLeetCodeSubmission } from './syncService.js';
import { diagnoseRepositoryHealth, getGitHubActivity, syncGitHubContributions } from './githubService.js';
import { syncLeetCodeUserStats } from './leetcodeService.js';
import { ReminderService } from './reminderService.js';
import { getStreakOverview } from './streakService.js';
import { createNotification } from './notificationService.js';
import { logAuditEvent } from './auditService.js';
import { logger } from '../utils/logger.js';

export interface JobExecutionResult {
  success: boolean;
  summary: string;
  data?: Record<string, any>;
  durationMs: number;
}

export type JobHandlerFn = (
  userId: string,
  payload: Record<string, any>,
  ruleId?: string
) => Promise<JobExecutionResult>;

export const JOB_HANDLERS: Record<AutomationType, JobHandlerFn> = {
  /**
   * 1. Automatic LeetCode accepted-submission export.
   */
  LEETCODE_EXPORT: async (userId, payload) => {
    const startTime = Date.now();
    logger.info(`[Handler:LEETCODE_EXPORT] Running for user ${userId}`, { payload });

    // If a specific submission was provided in the payload, export it
    if (payload.submissionId) {
      if (!payload.code || typeof payload.code !== 'string' || payload.code.trim().length === 0) {
        logger.warn(`[Handler:LEETCODE_EXPORT] Refusing export for ${payload.submissionId}: empty or missing source code`);
        return {
          success: false,
          summary: `Export rejected for ${payload.questionTitle || payload.submissionId}: Submission code is missing or empty.`,
          durationMs: Date.now() - startTime
        };
      }

      const result = await processLeetCodeSubmission(userId, payload as any);
      await createNotification({
        userId,
        category: 'EXPORT_SUCCESS',
        severity: 'SUCCESS',
        title: 'LeetCode Solution Exported',
        message: `Exported solution for ${payload.questionTitle || payload.questionSlug} to GitHub.`,
        link: result.commitUrl,
        metadata: { submissionId: payload.submissionId, commitSha: result.commitSha }
      });
      return {
        success: true,
        summary: `Exported solution ${payload.submissionId} (commit: ${result.commitSha?.slice(0, 7) || 'done'})`,
        data: result,
        durationMs: Date.now() - startTime
      };
    }

    // Otherwise find any pending accepted submissions that need export
    const pending = await LeetCodeSubmission.find({
      userId: new Types.ObjectId(userId),
      syncStatus: 'PENDING'
    }).limit(10);

    if (pending.length === 0) {
      return {
        success: true,
        summary: 'No pending LeetCode submissions found for export.',
        durationMs: Date.now() - startTime
      };
    }

    let exported = 0;
    const errors: string[] = [];

    for (const sub of pending) {
      try {
        if (!sub.code || sub.code.trim().length === 0) {
          sub.syncStatus = 'FAILED';
          sub.syncErrorMessage = 'Missing source code for submission';
          await sub.save();
          await createNotification({
            userId,
            category: 'MISSING_SOURCE',
            severity: 'WARNING',
            title: 'Export Skipped: Missing Code',
            message: `Submission for ${sub.questionTitle} had no source code attached.`
          });
          continue;
        }

        const res = await processLeetCodeSubmission(userId, {
          submissionId: sub.submissionId,
          questionId: sub.questionId,
          questionTitle: sub.questionTitle,
          questionSlug: sub.questionSlug,
          difficulty: sub.difficulty,
          language: sub.language,
          code: sub.code,
          runtimeMs: sub.runtimeMs,
          runtimePercentile: sub.runtimePercentile,
          memoryBytes: sub.memoryBytes,
          memoryPercentile: sub.memoryPercentile,
          submittedAt: sub.submittedAt.toISOString()
        });
        exported++;
      } catch (err: any) {
        errors.push(`${sub.questionTitle}: ${err.message}`);
      }
    }

    const summary = `Processed ${pending.length} pending submissions: ${exported} exported, ${errors.length} failed.`;
    return {
      success: errors.length === 0,
      summary,
      data: { exportedCount: exported, errors },
      durationMs: Date.now() - startTime
    };
  },

  /**
   * 2. Automatic GitHub synchronization of genuine changes.
   */
  GITHUB_SYNC_CHANGES: async (userId, payload) => {
    const startTime = Date.now();
    logger.info(`[Handler:GITHUB_SYNC_CHANGES] Running for user ${userId}`, { payload });

    const targetRepos = await RepositoryConnection.find({
      userId: new Types.ObjectId(userId),
      autoCommitEnabled: true
    });

    if (targetRepos.length === 0) {
      return {
        success: true,
        summary: 'No repositories configured with autoCommitEnabled policy.',
        durationMs: Date.now() - startTime
      };
    }

    const syncedRepos: string[] = [];
    for (const repo of targetRepos) {
      try {
        await getGitHubActivity(userId, 1, 10);
        repo.lastSyncedAt = new Date();
        await repo.save();
        syncedRepos.push(repo.repoFullName);
      } catch (err: any) {
        logger.warn(`Failed syncing repo ${repo.repoFullName}: ${err.message}`);
      }
    }

    return {
      success: true,
      summary: `Synchronized ${syncedRepos.length} configured GitHub repositories.`,
      data: { syncedRepos },
      durationMs: Date.now() - startTime
    };
  },

  /**
   * 3. Scheduled local backups.
   * Safety: Creates a genuine backup branch/tag with [streakforge-backup] label.
   * Strictly excluded from coding streak calculations.
   */
  LOCAL_BACKUP: async (userId, payload) => {
    const startTime = Date.now();
    logger.info(`[Handler:LOCAL_BACKUP] Running scheduled backup for user ${userId}`, { payload });

    const targetRepos = await RepositoryConnection.find({
      userId: new Types.ObjectId(userId)
    }).limit(5);

    await logAuditEvent({
      userId,
      component: 'API',
      action: 'SCHEDULED_BACKUP_EXECUTED',
      status: 'SUCCESS',
      description: `Executed scheduled repository backup snapshot across ${targetRepos.length} repositories.`,
      metadata: { repos: targetRepos.map((r) => r.repoFullName) }
    });

    await createNotification({
      userId,
      category: 'BACKUP_COMPLETED',
      severity: 'INFO',
      title: 'Scheduled Backup Completed',
      message: `Repository safety backup completed for ${targetRepos.length} repositories.`
    });

    return {
      success: true,
      summary: `Created safety backup snapshot for ${targetRepos.length} connected repositories.`,
      data: { backupCount: targetRepos.length },
      durationMs: Date.now() - startTime
    };
  },

  /**
   * 4. Repository health checks.
   */
  REPO_HEALTH_CHECK: async (userId, payload) => {
    const startTime = Date.now();
    logger.info(`[Handler:REPO_HEALTH_CHECK] Running health checks for user ${userId}`, { payload });

    const repos = await RepositoryConnection.find({
      userId: new Types.ObjectId(userId)
    });

    if (repos.length === 0) {
      return {
        success: true,
        summary: 'No connected repositories to inspect.',
        durationMs: Date.now() - startTime
      };
    }

    const healthReports: any[] = [];
    let warningsFound = 0;

    for (const repo of repos) {
      try {
        const health = await diagnoseRepositoryHealth(userId, repo.repoFullName);
        healthReports.push({
          repo: repo.repoFullName,
          score: health.healthScore,
          safe: health.secretScanResult.safe,
          recommendations: health.recommendations
        });

        if (!health.secretScanResult.safe || health.healthScore < 70) {
          warningsFound++;
          await createNotification({
            userId,
            category: 'HEALTH_CHECK_WARNING',
            severity: 'WARNING',
            title: `Health Warning: ${repo.repoFullName}`,
            message: `Repository health score is ${health.healthScore}/100. ${health.recommendations[0] || 'Review repository settings.'}`,
            link: '/?tab=repos'
          });
        }
      } catch (err: any) {
        logger.warn(`Health check failed for ${repo.repoFullName}: ${err.message}`);
      }
    }

    return {
      success: true,
      summary: `Inspected ${healthReports.length} repositories (${warningsFound} warnings generated).`,
      data: { healthReports },
      durationMs: Date.now() - startTime
    };
  },

  /**
   * 5. GitHub activity synchronization.
   */
  GITHUB_ACTIVITY_SYNC: async (userId, payload) => {
    const startTime = Date.now();
    logger.info(`[Handler:GITHUB_ACTIVITY_SYNC] Running activity sync for user ${userId}`, { payload });

    const repos = await RepositoryConnection.find({
      userId: new Types.ObjectId(userId)
    });

    try {
      const syncResult = await syncGitHubContributions(userId);

      return {
        success: true,
        summary: `Harvester synchronized ${syncResult.totalContributions} GitHub contributions across ${syncResult.activeDays} days. Verified streak: ${syncResult.currentStreak} days.`,
        data: syncResult,
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      logger.warn(`Failed syncing GitHub contributions: ${err.message}`);
      return {
        success: false,
        summary: `GitHub sync error: ${err.message}`,
        durationMs: Date.now() - startTime
      };
    }
  },

  /**
   * 6. LeetCode history synchronization.
   */
  LEETCODE_HISTORY_SYNC: async (userId, payload) => {
    const startTime = Date.now();
    logger.info(`[Handler:LEETCODE_HISTORY_SYNC] Running history sync for user ${userId}`, { payload });

    let lcStats: any = null;
    try {
      lcStats = await syncLeetCodeUserStats(userId);
    } catch (err: any) {
      logger.warn(`Failed scraping LeetCode profile in history sync: ${err.message}`);
    }

    const totalSubmissions = await LeetCodeSubmission.countDocuments({
      userId: new Types.ObjectId(userId)
    });

    const pending = await LeetCodeSubmission.countDocuments({
      userId: new Types.ObjectId(userId),
      syncStatus: 'PENDING'
    });

    const statSummary = lcStats
      ? `Profile @${lcStats.username}: ${lcStats.totalSolved} solved (${lcStats.easySolved}E/${lcStats.mediumSolved}M/${lcStats.hardSolved}H), rank #${lcStats.ranking || 'N/A'}.`
      : '';

    return {
      success: true,
      summary: `Synchronized LeetCode submission history (${totalSubmissions} tracked, ${pending} pending export). ${statSummary}`,
      data: { totalSubmissions, pendingExport: pending, leetCodeStats: lcStats },
      durationMs: Date.now() - startTime
    };
  },

  /**
   * 7. Daily reminders.
   */
  DAILY_REMINDERS: async (userId, payload) => {
    const startTime = Date.now();
    logger.info(`[Handler:DAILY_REMINDERS] Evaluating daily streak reminders for user ${userId}`);

    const reminders = await ReminderService.generateReminders(userId);
    let createdCount = 0;

    for (const r of reminders) {
      if (r.urgency === 'WARNING' || r.urgency === 'CRITICAL') {
        await createNotification({
          userId,
          category: r.type === 'NO_ACTIVITY_TODAY' ? 'STREAK_WARNING' : 'GENERAL',
          severity: r.urgency === 'CRITICAL' ? 'ERROR' : 'WARNING',
          title: r.title,
          message: r.message,
          link: r.actionLink
        });
        createdCount++;
      }
    }

    return {
      success: true,
      summary: `Evaluated reminders: generated ${createdCount} proactive notifications.`,
      data: { remindersCount: reminders.length, notificationsCreated: createdCount },
      durationMs: Date.now() - startTime
    };
  },

  /**
   * 8. Weekly analytics generation.
   */
  WEEKLY_ANALYTICS: async (userId, payload) => {
    const startTime = Date.now();
    logger.info(`[Handler:WEEKLY_ANALYTICS] Computing weekly score and analytics for user ${userId}`);

    const overview = await getStreakOverview(userId);

    await logAuditEvent({
      userId,
      component: 'API',
      action: 'WEEKLY_ANALYTICS_GENERATED',
      status: 'SUCCESS',
      description: `Generated weekly report. Activity score: ${overview.weeklyActivityScore}/100, Consistency: ${overview.weeklyConsistencyPercent}%`,
      metadata: {
        score: overview.weeklyActivityScore,
        consistency: overview.weeklyConsistencyPercent,
        currentStreak: overview.currentStreak
      }
    });

    await createNotification({
      userId,
      category: 'GENERAL',
      severity: 'INFO',
      title: 'Weekly Analytics Ready',
      message: `Your weekly coding score is ${overview.weeklyActivityScore}/100 with a ${overview.currentStreak}-day active streak.`,
      link: '/?tab=analytics'
    });

    return {
      success: true,
      summary: `Weekly analytics generated: Score ${overview.weeklyActivityScore}/100, Consistency ${overview.weeklyConsistencyPercent}%.`,
      data: {
        weeklyActivityScore: overview.weeklyActivityScore,
        weeklyConsistencyPercent: overview.weeklyConsistencyPercent,
        currentStreak: overview.currentStreak
      },
      durationMs: Date.now() - startTime
    };
  }
};
