import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRepositoryConnectionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  githubRepoId: number;
  repoFullName: string;
  description?: string;
  primaryLanguage?: string;
  cloneUrl?: string;
  defaultBranch: string;
  solutionPathPattern: string;
  isPrivate: boolean;
  isTargetForLeetCode: boolean;
  autoCommitEnabled: boolean;
  category: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  syncPolicy?: {
    autoCommit: boolean;
    autoPush: boolean;
    branch: string;
    pathPattern: string;
    intervalMinutes: number;
  };
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RepositoryConnectionSchema = new Schema<IRepositoryConnectionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    githubRepoId: { type: Number, required: true },
    repoFullName: { type: String, required: true },
    description: { type: String },
    primaryLanguage: { type: String },
    cloneUrl: { type: String },
    defaultBranch: { type: String, default: 'main' },
    solutionPathPattern: { type: String, default: 'solutions/{difficulty}/{id}-{slug}' },
    isPrivate: { type: Boolean, default: false },
    isTargetForLeetCode: { type: Boolean, default: true, index: true },
    autoCommitEnabled: { type: Boolean, default: false },
    category: { type: String, default: 'LeetCode Solutions' },
    permissions: {
      admin: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      pull: { type: Boolean, default: true }
    },
    syncPolicy: {
      autoCommit: { type: Boolean, default: false },
      autoPush: { type: Boolean, default: false },
      branch: { type: String, default: 'main' },
      pathPattern: { type: String, default: 'solutions/{difficulty}/{id}-{slug}' },
      intervalMinutes: { type: Number, default: 15 }
    },
    lastSyncedAt: { type: Date }
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

RepositoryConnectionSchema.index({ userId: 1, repoFullName: 1 }, { unique: true });

export const RepositoryConnection = mongoose.model<IRepositoryConnectionDocument>(
  'RepositoryConnection',
  RepositoryConnectionSchema
);

