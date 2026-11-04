import mongoose, { Schema, Document, Types } from 'mongoose';
import type { AutomationType, JobStatus } from '@streakforge/shared-types';

export interface IJobRecordDoc extends Document {
  jobId: string;
  userId: Types.ObjectId;
  automationRuleId?: Types.ObjectId;
  jobType: AutomationType;
  payload: Record<string, any>;
  status: JobStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  retryCount: number;
  maxRetries: number;
  nextRunAt: Date;
  error?: {
    message: string;
    stack?: string;
    code?: string;
    failedAt: Date;
  };
  idempotencyKey: string;
  workerId?: string;
  lockedAt?: Date;
  progress?: number;
  result?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const JobRecordSchema = new Schema<IJobRecordDoc>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    automationRuleId: { type: Schema.Types.ObjectId, ref: 'AutomationRule' },
    jobType: {
      type: String,
      required: true,
      enum: [
        'LEETCODE_EXPORT',
        'GITHUB_SYNC_CHANGES',
        'LOCAL_BACKUP',
        'REPO_HEALTH_CHECK',
        'GITHUB_ACTIVITY_SYNC',
        'LEETCODE_HISTORY_SYNC',
        'DAILY_REMINDERS',
        'WEEKLY_ANALYTICS'
      ]
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      required: true,
      default: 'QUEUED',
      enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED'],
      index: true
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    durationMs: { type: Number },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    nextRunAt: { type: Date, default: () => new Date(), index: true },
    error: {
      message: { type: String },
      stack: { type: String },
      code: { type: String },
      failedAt: { type: Date }
    },
    idempotencyKey: { type: String, required: true, index: true },
    workerId: { type: String },
    lockedAt: { type: Date },
    progress: { type: Number, default: 0 },
    result: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'job_records'
  }
);

JobRecordSchema.index({ status: 1, nextRunAt: 1 });
JobRecordSchema.index({ userId: 1, idempotencyKey: 1, status: 1 });
JobRecordSchema.index({ userId: 1, createdAt: -1 });

export const JobRecord = mongoose.model<IJobRecordDoc>('JobRecord', JobRecordSchema);
