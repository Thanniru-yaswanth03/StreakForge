import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getStreakOverview,
  getHeatmapData,
  getDayDetails,
  recalculateHistoricalStreaks
} from '../services/streakService.js';
import { ReminderService } from '../services/reminderService.js';
import { DeveloperAnalyticsService } from '../services/developerAnalyticsService.js';
import type { ReportPeriod } from '@streakforge/shared-types';

export const analyticsRouter: Router = Router();

analyticsRouter.get('/overview', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const overview = await getStreakOverview(req.userId!);
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/heatmap', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const heatmap = await getHeatmapData(req.userId!, year);
    res.json({
      success: true,
      data: heatmap
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/reminders', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const reminders = await ReminderService.generateReminders(req.userId!);
    res.json({
      success: true,
      data: reminders
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/day-details', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const details = await getDayDetails(req.userId!, date);
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post('/recalculate', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await recalculateHistoricalStreaks(req.userId!, req.body?.timezone);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 7 — Comprehensive GitHub Analytics
 * GET /api/v1/analytics/github
 */
analyticsRouter.get('/github', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = await DeveloperAnalyticsService.getGitHubAnalytics(req.userId!);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 7 — LeetCode Analytics (Strict Deduplication & Topic Breakdown)
 * GET /api/v1/analytics/leetcode
 */
analyticsRouter.get('/leetcode', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = await DeveloperAnalyticsService.getLeetCodeAnalytics(req.userId!);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 7 — Coding Duration & Session Analytics
 * GET /api/v1/analytics/coding
 */
analyticsRouter.get('/coding', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = await DeveloperAnalyticsService.getCodingAnalytics(req.userId!);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 7 — Daily Activity Journal
 * GET /api/v1/analytics/journal?date=YYYY-MM-DD
 */
analyticsRouter.get('/journal', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const data = await DeveloperAnalyticsService.getDailyJournal(req.userId!, date);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 7 — Edit Daily Journal Personal Notes
 * PUT /api/v1/analytics/journal
 */
analyticsRouter.put('/journal', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const date = (req.body?.date as string) || (req.query.date as string) || new Date().toISOString().split('T')[0];
    const notes = req.body?.notes || '';
    const data = await DeveloperAnalyticsService.saveJournalNote(req.userId!, date, notes);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 7 — Periodic Summary Reports
 * GET /api/v1/analytics/reports?period=daily|weekly|monthly|quarterly|annual&date=YYYY-MM-DD
 */
analyticsRouter.get('/reports', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const period = ((req.query.period as string) || 'monthly') as ReportPeriod;
    const date = req.query.date as string | undefined;
    const report = await DeveloperAnalyticsService.generateReport(req.userId!, period, date);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 7 — Report Export (CSV or JSON download)
 * GET /api/v1/analytics/reports/export?period=...&format=csv|json
 */
analyticsRouter.get('/reports/export', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const period = ((req.query.period as string) || 'monthly') as ReportPeriod;
    const date = req.query.date as string | undefined;
    const format = (req.query.format as string) || 'csv';

    const report = await DeveloperAnalyticsService.generateReport(req.userId!, period, date);

    if (format === 'csv') {
      const csv = DeveloperAnalyticsService.exportReportCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="streakforge-${period}-report-${report.startDate}.csv"`
      );
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="streakforge-${period}-report-${report.startDate}.json"`
      );
      res.json(report);
    }
  } catch (error) {
    next(error);
  }
});
