import mongoose, { Schema, Document, Types } from 'mongoose';
import type {
  AutomationType,
  AutomationTriggerType,
  AutomationExecutionPolicy,
  AutomationFailurePolicy,
  AutomationLastExecution
} from '@streakforge/shared-types';

export interface IAutomationRuleDoc extends Document {
  userId: Types.ObjectId;
  name: string;
  description: string;
  type: AutomationType;
  enabled: boolean;
  triggerType: AutomationTriggerType;
  schedule: string;
  timezone: string;
  repositoryScope: 'ALL' | 'DEFAULT' | string[];
  executionPolicy: AutomationExecutionPolicy;
  lastExecution?: AutomationLastExecution;
  nextExecution?: Date;
  failurePolicy: AutomationFailurePolicy;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationRuleSchema = new Schema<IAutomationRuleDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    type: {
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
    enabled: { type: Boolean, default: true, index: true },
    triggerType: {
      type: String,
      default: 'CRON',
      enum: ['CRON', 'EVENT', 'MANUAL', 'WEBHOOK']
    },
    schedule: { type: String, required: true },
    timezone: { type: String, default: 'UTC' },
    repositoryScope: { type: Schema.Types.Mixed, default: 'DEFAULT' },
    executionPolicy: {
      timeoutSeconds: { type: Number, default: 300 },
      concurrency: { type: String, enum: ['FORBID', 'ALLOW'], default: 'FORBID' },
      retryLimit: { type: Number, default: 3 },
      backoffInitialSeconds: { type: Number, default: 10 }
    },
    lastExecution: {
      timestamp: { type: Date },
      status: { type: String, enum: ['SUCCESS', 'FAILURE', 'SKIPPED'] },
      durationMs: { type: Number },
      summary: { type: String },
      jobId: { type: String }
    },
    nextExecution: { type: Date, index: true },
    failurePolicy: {
      maxRetries: { type: Number, default: 3 },
      backoffMultiplier: { type: Number, default: 2 },
      deadLetter: { type: Boolean, default: true },
      notifyOnFailure: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true,
    collection: 'automation_rules'
  }
);

AutomationRuleSchema.index({ userId: 1, type: 1 });
AutomationRuleSchema.index({ enabled: 1, nextExecution: 1 });

export const AutomationRule = mongoose.model<IAutomationRuleDoc>(
  'AutomationRule',
  AutomationRuleSchema
);
