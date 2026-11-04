import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getStreakOverview,
  getHeatmapData,
  getDayDetails,
  recalculateHistoricalStreaks
} from '../services/streakService.js';
import { ReminderService } from '../services/reminderService.js';

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
