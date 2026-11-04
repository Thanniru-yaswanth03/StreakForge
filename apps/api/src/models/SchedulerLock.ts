import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedulerLockDoc extends Document {
  lockKey: string;
  owner: string;
  expiresAt: Date;
  acquiredAt: Date;
}

const SchedulerLockSchema = new Schema<ISchedulerLockDoc>(
  {
    lockKey: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    acquiredAt: { type: Date, default: () => new Date() }
  },
  {
    collection: 'scheduler_locks'
  }
);

export const SchedulerLock = mongoose.model<ISchedulerLockDoc>(
  'SchedulerLock',
  SchedulerLockSchema
);

