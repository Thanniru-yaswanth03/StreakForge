import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { LeetCodeSubmissionInputSchema } from '@streakforge/validation';
import { processLeetCodeSubmission } from '../services/syncService.js';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';

export const syncRouter: Router = Router();

syncRouter.post(
  '/leetcode/submission',
  requireAuth,
  validateBody(LeetCodeSubmissionInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const result = await processLeetCodeSubmission(req.userId!, req.body);
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

      res.json({
        success: true,
        data: items,
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
