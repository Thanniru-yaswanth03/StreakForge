import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRepositoryConnectionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  githubRepoId: number;
  repoFullName: string;
  defaultBranch: string;
  solutionPathPattern: string;
  isPrivate: boolean;
  isTargetForLeetCode: boolean;
  autoCommitEnabled: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RepositoryConnectionSchema = new Schema<IRepositoryConnectionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    githubRepoId: { type: Number, required: true },
    repoFullName: { type: String, required: true },
    defaultBranch: { type: String, default: 'main' },
    solutionPathPattern: { type: String, default: 'solutions/{difficulty}/{id}-{slug}' },
    isPrivate: { type: Boolean, default: false },
    isTargetForLeetCode: { type: Boolean, default: true, index: true },
    autoCommitEnabled: { type: Boolean, default: false },
    lastSyncedAt: { type: Date }
  },
  { timestamps: true }
);

RepositoryConnectionSchema.index({ userId: 1, repoFullName: 1 }, { unique: true });

export const RepositoryConnection = mongoose.model<IRepositoryConnectionDocument>(
  'RepositoryConnection',
  RepositoryConnectionSchema
);

