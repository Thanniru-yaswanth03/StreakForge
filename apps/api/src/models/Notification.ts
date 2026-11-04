import mongoose, { Schema, Document, Types } from 'mongoose';
import type { NotificationCategory, NotificationSeverity } from '@streakforge/shared-types';

export interface INotificationDoc extends Document {
  userId: Types.ObjectId;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: [
        'EXPORT_SUCCESS',
        'EXPORT_FAILURE',
        'AUTH_EXPIRATION',
        'AGENT_DISCONNECTED',
        'BACKUP_COMPLETED',
        'MISSING_SOURCE',
        'PENDING_APPROVAL',
        'STREAK_WARNING',
        'HEALTH_CHECK_WARNING',
        'GENERAL'
      ]
    },
    severity: {
      type: String,
      default: 'INFO',
      enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR']
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    metadata: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date }
  },
  {
    timestamps: true,
    collection: 'notifications'
  }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDoc>(
  'Notification',
  NotificationSchema
);
