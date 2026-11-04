import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ActivityCategory, ActivityEventType } from '@streakforge/shared-types';

export interface IActivityRecordDocument extends Document {
  _id: Types.ObjectId;
  id: string; // Idempotent event key (e.g. userId:source:eventType:refId)
  userId: Types.ObjectId;
  category: ActivityCategory;
  eventType: ActivityEventType;
  source: 'GITHUB' | 'LEETCODE' | 'LOCAL_AGENT' | 'SYSTEM';
  timestamp: Date;
  date: string; // YYYY-MM-DD in user's timezone
  reference: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityRecordSchema = new Schema<IActivityRecordDocument>(
  {
    id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      enum: ['GITHUB', 'LEETCODE', 'LOCAL_DEV', 'MAINTENANCE'],
      required: true,
      index: true
    },
    eventType: { type: String, required: true },
    source: {
      type: String,
      enum: ['GITHUB', 'LEETCODE', 'LOCAL_AGENT', 'SYSTEM'],
      required: true
    },
    timestamp: { type: Date, required: true, index: true },
    date: { type: String, required: true, index: true },
    reference: { type: String, required: true },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'UNVERIFIED', 'REJECTED'],
      default: 'VERIFIED'
    },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

// Prevent duplicate event ingestion
ActivityRecordSchema.index({ userId: 1, id: 1 }, { unique: true });
ActivityRecordSchema.index({ userId: 1, date: 1, category: 1 });
ActivityRecordSchema.index({ userId: 1, timestamp: -1 });

export const ActivityRecord = mongoose.model<IActivityRecordDocument>(
  'ActivityRecord',
  ActivityRecordSchema
);
