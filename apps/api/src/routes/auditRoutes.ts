import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { AuditLogQuerySchema } from '@streakforge/validation';
import { AuditLog } from '../models/AuditLog.js';

export const auditRouter: Router = Router();

auditRouter.get(
  '/logs',
  requireAuth,
  validateQuery(AuditLogQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const component = req.query.component as string;
      const status = req.query.status as string;
      const action = req.query.action as string;

      const filter: any = { userId: new Types.ObjectId(req.userId) };
      if (component) filter.component = component;
      if (status) filter.status = status;
      if (action) filter.action = action;

      if (req.query.startDate || req.query.endDate) {
        filter.timestamp = {};
        if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate as string);
        if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate as string);
      }

      const total = await AuditLog.countDocuments(filter);
      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({
        success: true,
        data: logs,
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
