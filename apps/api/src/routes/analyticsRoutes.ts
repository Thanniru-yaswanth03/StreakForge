import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { getStreakOverview, getHeatmapData } from '../services/streakService.js';

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
