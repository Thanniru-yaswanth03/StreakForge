import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import type { NotificationCategory, NotificationSeverity } from '@streakforge/shared-types';
import { logger } from '../utils/logger.js';

export interface CreateNotificationParams {
  userId: string;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const doc = new Notification({
      userId: new Types.ObjectId(params.userId),
      category: params.category,
      severity: params.severity || 'INFO',
      title: params.title,
      message: params.message,
      link: params.link,
      metadata: params.metadata,
      isRead: false
    });

    await doc.save();
    logger.info(`[Notification] Created ${params.category} for user ${params.userId}: ${params.title}`);
    return doc;
  } catch (error) {
    logger.error('[Notification] Failed to create notification', { error, params });
    throw error;
  }
}

export async function getNotifications(
  userId: string,
  options: { page?: number; limit?: number; unreadOnly?: boolean; category?: string } = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const query: any = { userId: new Types.ObjectId(userId) };
  if (options.unreadOnly) {
    query.isRead = false;
  }
  if (options.category && options.category !== 'ALL') {
    query.category = options.category;
  }

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: new Types.ObjectId(userId), isRead: false })
  ]);

  return {
    items: items.map((n) => ({
      id: (n as any)._id.toString(),
      userId: n.userId.toString(),
      category: n.category,
      severity: n.severity,
      title: n.title,
      message: n.message,
      link: n.link,
      metadata: n.metadata,
      isRead: n.isRead,
      readAt: n.readAt ? n.readAt.toISOString() : undefined,
      createdAt: n.createdAt.toISOString()
    })),
    total,
    unreadCount,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

export async function markAsRead(userId: string, notificationId: string) {
  if (!Types.ObjectId.isValid(notificationId)) return false;
  const doc = await Notification.findOneAndUpdate(
    { _id: new Types.ObjectId(notificationId), userId: new Types.ObjectId(userId) },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  return doc !== null;
}

export async function markAllAsRead(userId: string) {
  const result = await Notification.updateMany(
    { userId: new Types.ObjectId(userId), isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result.modifiedCount;
}

export async function deleteNotification(userId: string, notificationId: string) {
  if (!Types.ObjectId.isValid(notificationId)) return false;
  const result = await Notification.deleteOne({
    _id: new Types.ObjectId(notificationId),
    userId: new Types.ObjectId(userId)
  });
  return result.deletedCount > 0;
}

export async function clearAllNotifications(userId: string) {
  const result = await Notification.deleteMany({ userId: new Types.ObjectId(userId) });
  return result.deletedCount;
}

