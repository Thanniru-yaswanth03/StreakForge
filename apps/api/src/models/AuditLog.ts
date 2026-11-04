import mongoose, { Schema, Document, Types } from 'mongoose';
import type { AuditComponent, AuditStatus } from '@streakforge/shared-types';

export interface IAuditLogDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  component: AuditComponent;
  action: string;
  status: AuditStatus;
  description: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    component: {
      type: String,
      enum: ['API', 'EXTENSION', 'AGENT', 'WEB'],
      required: true,
      index: true
    },
    action: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING', 'INFO'],
      required: true,
      index: true
    },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

AuditLogSchema.index({ userId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

