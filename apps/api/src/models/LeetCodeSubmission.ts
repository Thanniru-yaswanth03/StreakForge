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
  topicTags?: string[];
  problemUrl?: string;
  submittedAt: Date;
  syncStatus: SyncStatus;
  githubCommitSha?: string;
  githubCommitUrl?: string;
  targetRepoFullName?: string;
  targetBranch?: string;
  filePath?: string;
  syncErrorMessage?: string;
  importSource?: 'LIVE_EXTENSION' | 'HISTORY_IMPORT' | 'PUBLIC_API';
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
    code: { type: String, default: '' },
    runtimeMs: { type: Number, default: 0 },
    runtimePercentile: { type: Number, default: 0 },
    memoryBytes: { type: Number, default: 0 },
    memoryPercentile: { type: Number, default: 0 },
    status: { type: String, default: 'Accepted' },
    topicTags: { type: [String], default: [] },
    problemUrl: { type: String },
    submittedAt: { type: Date, required: true },
    syncStatus: {
      type: String,
      enum: ['PENDING', 'SYNCED', 'FAILED', 'SKIPPED'],
      default: 'PENDING',
      index: true
    },
    githubCommitSha: { type: String },
    githubCommitUrl: { type: String },
    targetRepoFullName: { type: String },
    targetBranch: { type: String },
    filePath: { type: String },
    syncErrorMessage: { type: String },
    importSource: {
      type: String,
      enum: ['LIVE_EXTENSION', 'HISTORY_IMPORT', 'PUBLIC_API'],
      default: 'LIVE_EXTENSION'
    },
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
LeetCodeSubmissionSchema.index({ userId: 1, questionSlug: 1 });
LeetCodeSubmissionSchema.index({ userId: 1, syncStatus: 1, submittedAt: -1 });

export const LeetCodeSubmission = mongoose.model<ILeetCodeSubmissionDocument>(
  'LeetCodeSubmission',
  LeetCodeSubmissionSchema
);

