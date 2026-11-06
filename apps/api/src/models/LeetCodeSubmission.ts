import mongoose, { Schema, Document, Types } from 'mongoose';
import type { Difficulty, SyncStatus } from '@streakforge/shared-types';

export interface ILeetCodeSubmissionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  submissionId: string;
  questionId: string;
  questionTitle: string;
  questionSlug: string;
  difficulty: Difficulty;
  language: string;
  code: string;
  runtimeMs: number;
  runtimePercentile: number;
  memoryBytes: number;
  memoryPercentile: number;
  status: 'Accepted';
  submittedAt: Date;
  syncStatus: SyncStatus;
  githubCommitSha?: string;
  githubCommitUrl?: string;
  filePath?: string;
  syncErrorMessage?: string;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeetCodeSubmissionSchema = new Schema<ILeetCodeSubmissionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submissionId: { type: String, required: true },
    questionId: { type: String, required: true },
    questionTitle: { type: String, required: true },
    questionSlug: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    runtimeMs: { type: Number, required: true },
    runtimePercentile: { type: Number, required: true },
    memoryBytes: { type: Number, required: true },
    memoryPercentile: { type: Number, required: true },
    status: { type: String, default: 'Accepted' },
    submittedAt: { type: Date, required: true },
    syncStatus: {
      type: String,
      enum: ['PENDING', 'SYNCED', 'FAILED', 'SKIPPED'],
      default: 'PENDING',
      index: true
    },
    githubCommitSha: { type: String },
    githubCommitUrl: { type: String },
    filePath: { type: String },
    syncErrorMessage: { type: String },
    syncedAt: { type: Date }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id?.toString?.() || ret._id;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id?.toString?.() || ret._id;
        return ret;
      }
    }
  }
);

LeetCodeSubmissionSchema.index({ userId: 1, submissionId: 1 }, { unique: true });
LeetCodeSubmissionSchema.index({ userId: 1, submittedAt: -1 });

export const LeetCodeSubmission = mongoose.model<ILeetCodeSubmissionDocument>(
  'LeetCodeSubmission',
  LeetCodeSubmissionSchema
);

