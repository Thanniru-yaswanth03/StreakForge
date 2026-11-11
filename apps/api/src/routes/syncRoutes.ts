import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  LeetCodeSubmissionInputSchema,
  HistoricalImportInputSchema,
  BatchDeleteSubmissionsSchema
} from '@streakforge/validation';
import {
  processLeetCodeSubmission,
  getSubmissionHistoryWithMetrics,
  importHistoricalSubmissions,
  importPublicRecentFromLeetCode,
  getCanonicalSyncState,
  getSyncDiagnostics,
  deleteSubmissionsByIds
} from '../services/syncService.js';
import {
  getOrRefreshLeetCodeStats,
  syncLeetCodeUserStats,
  fetchLeetCodeUserStats
} from '../services/leetcodeService.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';

export const syncRouter: Router = Router();

syncRouter.get(
  '/state',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const state = await getCanonicalSyncState(req.userId!, req.token);
      res.json({
        success: true,
        data: state
      });
    } catch (error) {
      next(error);
    }
  }
);

syncRouter.get(
  '/diagnostics',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const report = await getSyncDiagnostics(req.userId!);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
);

syncRouter.post(
  '/leetcode/submission',
  requireAuth,
  validateBody(LeetCodeSubmissionInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const result = await processLeetCodeSubmission(req.userId!, req.body);

      // Automatically re-sync live LeetCode stats and contribution snapshots on accepted submission
      syncLeetCodeUserStats(req.userId!).catch((err) => {
        console.warn('[SyncRouter] Background LeetCode profile re-sync error:', err);
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

syncRouter.post(
  '/leetcode/import',
  requireAuth,
  validateBody(HistoricalImportInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { submissions, autoExportToGitHub, importSource } = req.body;
      const result = await importHistoricalSubmissions(req.userId!, submissions, {
        autoExportToGitHub,
        importSource
      });
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

syncRouter.post(
  '/leetcode/import-public',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim() : undefined;
      const result = await importPublicRecentFromLeetCode(req.userId!, username);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

syncRouter.get(
  '/leetcode/history',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const result = await getSubmissionHistoryWithMetrics(req.userId!, {
        page,
        limit,
        status: req.query.status as string | undefined,
        difficulty: req.query.difficulty as string | undefined,
        language: req.query.language as string | undefined,
        topic: req.query.topic as string | undefined,
        fromDate: req.query.fromDate as string | undefined,
        toDate: req.query.toDate as string | undefined,
        search: req.query.search as string | undefined,
        sort: req.query.sort as string | undefined
      });

      res.json({
        success: true,
        data: result.items,
        meta: {
          ...result.meta,
          metrics: result.metrics,
          facets: result.facets
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

syncRouter.post(
  '/leetcode/:id/retry',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const idStr = String(req.params.id);
      if (!Types.ObjectId.isValid(idStr)) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      const sub = await LeetCodeSubmission.findOne({
        _id: new Types.ObjectId(idStr),
        userId: new Types.ObjectId(req.userId)
      });

      if (!sub) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }

      if (!sub.code || sub.code.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SOURCE_CODE',
            message: 'Cannot export submission without source code. Re-submit on LeetCode or run Extension Session Import.'
          }
        });
        return;
      }

      const result = await processLeetCodeSubmission(
        req.userId!,
        {
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
          submittedAt: sub.submittedAt.toISOString(),
          topicTags: sub.topicTags,
          problemUrl: sub.problemUrl
        },
        { forceExport: true }
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

syncRouter.post(
  '/leetcode/bulk-delete',
  requireAuth,
  validateBody(BatchDeleteSubmissionsSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const deletedCount = await deleteSubmissionsByIds(req.userId!, req.body.ids);
      res.json({
        success: true,
        data: { deletedCount }
      });
    } catch (error) {
      next(error);
    }
  }
);

syncRouter.delete(
  '/leetcode/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const idStr = String(req.params.id);
      if (!Types.ObjectId.isValid(idStr)) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }
      const deletedCount = await deleteSubmissionsByIds(req.userId!, [idStr]);
      if (deletedCount === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Submission not found' }
        });
        return;
      }
      res.json({
        success: true,
        data: { deletedCount }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/sync/leetcode/profile-stats
 * Retrieve authentic scraped LeetCode profile stats (ranking, total solved, breakdown)
 */
syncRouter.get(
  '/leetcode/profile-stats',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const stats = await getOrRefreshLeetCodeStats(req.userId!);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/sync/leetcode/profile-stats/refresh
 * Force immediate scrape and sync of LeetCode user profile stats
 */
syncRouter.post(
  '/leetcode/profile-stats/refresh',
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const username = (req.body?.username as string)?.trim() || undefined;

      // Authenticated user: persist and sync to user document
      if (req.userId) {
        const stats = await syncLeetCodeUserStats(req.userId, username);
        res.json({
          success: true,
          data: stats
        });
        return;
      }

      // Guest user: fetch authentic public stats directly without requiring session
      if (!username) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USERNAME',
            message: 'LeetCode username is required for guest profile lookup'
          }
        });
        return;
      }

      const scraped = await fetchLeetCodeUserStats(username);
      res.json({
        success: true,
        data: scraped
      });
    } catch (error) {
      next(error);
    }
  }
);
