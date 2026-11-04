import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} from '../services/notificationService.js';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/v1/notifications
 * Get paginated notifications.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';
    const category = (req.query.category as string) || undefined;

    const result = await getNotifications(req.userId!, {
      page,
      limit,
      unreadOnly,
      category
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = await markAsRead(req.userId!, id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/notifications/mark-all-read
 * Mark all notifications as read for current user.
 */
router.post('/mark-all-read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const count = await markAllAsRead(req.userId!);
    res.json({ success: true, data: { updatedCount: count } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Delete a specific notification.
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = await deleteNotification(req.userId!, id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/notifications
 * Clear all notifications for user.
 */
router.delete('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const count = await clearAllNotifications(req.userId!);
    res.json({ success: true, data: { deletedCount: count } });
  } catch (err) {
    next(err);
  }
});

export const notificationRoutes = router;
