import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { LeetCodeSubmissionInputSchema } from '@streakforge/validation';
import { processLeetCodeSubmission } from '../services/syncService.js';
import { getOrRefreshLeetCodeStats, syncLeetCodeUserStats } from '../services/leetcodeService.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';

export const syncRouter: Router = Router();

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

syncRouter.get(
  '/leetcode/history',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const status = req.query.status as string;

      const query: any = { userId: new Types.ObjectId(req.userId) };
      if (status) {
        query.syncStatus = status;
      }

      const total = await LeetCodeSubmission.countDocuments(query);
      const items = await LeetCodeSubmission.find(query)
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const mapped = items.map((doc) => {
        const obj = doc.toObject();
        return {
          ...obj,
          id: doc._id.toString(),
          _id: doc._id.toString()
        };
      });

      res.json({
        success: true,
        data: mapped,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
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

      const result = await processLeetCodeSubmission(req.userId!, {
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

      res.json({
        success: true,
        data: result
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
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const username = (req.body?.username as string) || undefined;
      const stats = await syncLeetCodeUserStats(req.userId!, username);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);
