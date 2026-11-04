import mongoose, { Schema, Document, Types } from 'mongoose';
import type { AgentStatus } from '@streakforge/shared-types';

export interface ILocalAgentInstanceDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  agentId: string;
  name: string;
  hostname: string;
  os: string;
  agentVersion: string;
  apiKeyHash: string;
  status: AgentStatus;
  lastHeartbeatAt: Date;
  watchedPaths: string[];
  rules: {
    idleAutoCommitMinutes: number;
    autoPushOnCommit: boolean;
    allowedBranches: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const LocalAgentInstanceSchema = new Schema<ILocalAgentInstanceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    hostname: { type: String, required: true },
    os: { type: String, required: true },
    agentVersion: { type: String, required: true },
    apiKeyHash: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'PAUSED'],
      default: 'ONLINE'
    },
    lastHeartbeatAt: { type: Date, default: Date.now },
    watchedPaths: [{ type: String }],
    rules: {
      idleAutoCommitMinutes: { type: Number, default: 15 },
      autoPushOnCommit: { type: Boolean, default: false },
      allowedBranches: [{ type: String, default: 'main' }]
    }
  },
  { timestamps: true }
);

export const LocalAgentInstance = mongoose.model<ILocalAgentInstanceDocument>(
  'LocalAgentInstance',
  LocalAgentInstanceSchema
);

