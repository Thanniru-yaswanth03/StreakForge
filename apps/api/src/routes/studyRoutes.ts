import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { StudyService } from '../services/studyService.js';
import { CatalogService } from '../services/catalogService.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { User } from '../models/User.js';
import { DailyActivitySnapshot } from '../models/DailyActivitySnapshot.js';
import type { CurriculumTrackId, StudyProblemStatus, SrsRating, LearningIntelligenceSummary } from '@streakforge/shared-types';

export const studyRouter: Router = Router();

/**
 * Fetch curriculum progress for a given track (blind75, neetcode150, topInterview150)
 */
studyRouter.get('/curriculum/:track', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const track = (req.params.track as CurriculumTrackId) || 'blind75';
    const data = await StudyService.getCurriculumProgress(req.userId!, track);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * Update problem status or notes
 */
studyRouter.post('/status', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { questionSlug, status, userNotes } = req.body as {
      questionSlug: string;
      status: StudyProblemStatus;
      userNotes?: string;
    };

    if (!questionSlug || !status) {
      res.status(400).json({ success: false, error: { message: 'questionSlug and status are required' } });
      return;
    }

    const updated = await StudyService.updateProblemStatus(req.userId!, questionSlug, status, userNotes);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * Record a Spaced Repetition review (SuperMemo-2)
 */
studyRouter.post('/review', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { questionSlug, rating, userNotes } = req.body as {
      questionSlug: string;
      rating: SrsRating;
      userNotes?: string;
    };

    if (!questionSlug || !rating) {
      res.status(400).json({ success: false, error: { message: 'questionSlug and rating are required' } });
      return;
    }

    const updated = await StudyService.recordReview(req.userId!, questionSlug, rating, userNotes);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * Fetch Spaced Repetition Queue (due today, overdue, upcoming)
 */
studyRouter.get('/revision-queue', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const queue = await StudyService.getRevisionQueue(req.userId!);
    res.json({ success: true, data: queue });
  } catch (error) {
    next(error);
  }
});

/**
 * Learning Intelligence Aggregation
 */
studyRouter.get('/intelligence', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const user = await User.findById(userId).lean();

    const [blind75Data, neetcodeData, top150Data, queue] = await Promise.all([
      StudyService.getCurriculumProgress(userId, 'blind75'),
      StudyService.getCurriculumProgress(userId, 'neetcode150'),
      StudyService.getCurriculumProgress(userId, 'topInterview150'),
      StudyService.getRevisionQueue(userId)
    ]);

    // Topic strengths analysis
    const topicMap: Record<string, { total: number; solved: number }> = {};
    Object.entries(neetcodeData.topicStats).forEach(([topic, stats]) => {
      topicMap[topic] = { total: stats.total, solved: stats.solved };
    });

    const topicStrengths = Object.entries(topicMap).map(([topic, stats]) => {
      const accuracyPercent = Math.round((stats.solved / Math.max(1, stats.total)) * 100);
      let status: 'STRONG' | 'GROWING' | 'NEEDS_FOCUS' = 'NEEDS_FOCUS';
      if (accuracyPercent >= 60) status = 'STRONG';
      else if (accuracyPercent >= 25) status = 'GROWING';

      return {
        topic,
        solved: stats.solved,
        total: stats.total,
        accuracyPercent,
        status
      };
    }).sort((a, b) => b.accuracyPercent - a.accuracyPercent);

    // Target repository catalog freshness
    const targetRepo = await RepositoryConnection.findOne({ userId, isTargetForLeetCode: true }).lean();
    const repoFullName = targetRepo?.repoFullName || '';
    const catalogItems = repoFullName ? await CatalogService.getCatalogItems(userId, repoFullName) : [];

    const overview = await (await import('../services/streakService.js')).getStreakOverview(userId);
    const totalReviews = queue.totalMastered + queue.totalNeedsRevision;

    const summary: LearningIntelligenceSummary = {
      totalSolvedLeetCode: user?.leetcodeStats?.totalSolved || 0,
      authenticStreakDays: overview.currentStreak || 0,
      longestStreakDays: Math.max(overview.longestStreak || 0, user?.leetcodeStats?.maxStreak || 0),
      curriculumProgress: {
        blind75: {
          solved: blind75Data.solvedCount,
          total: blind75Data.totalProblems,
          percentage: blind75Data.completionPercent
        },
        neetcode150: {
          solved: neetcodeData.solvedCount,
          total: neetcodeData.totalProblems,
          percentage: neetcodeData.completionPercent
        },
        topInterview150: {
          solved: top150Data.solvedCount,
          total: top150Data.totalProblems,
          percentage: top150Data.completionPercent
        }
      },
      topicStrengths,
      srsHealth: {
        dueTodayCount: queue.dueToday.length,
        overdueCount: queue.overdue.length,
        masteredCount: queue.totalMastered,
        retentionRatePercent: totalReviews > 0 ? Math.round((queue.totalMastered / totalReviews) * 100) : 0
      },
      catalogStatus: {
        repoFullName,
        totalSolutionsCataloged: catalogItems.length,
        lastCatalogSyncedAt: targetRepo?.lastSyncedAt ? new Date(targetRepo.lastSyncedAt).toISOString() : undefined,
        isFresh: true
      }
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

