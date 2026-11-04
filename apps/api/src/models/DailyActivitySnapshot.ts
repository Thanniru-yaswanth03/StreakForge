import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDailyActivitySnapshotDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD format
  gitCommitCount: number;
  leetCodeCount: number;
  totalActivities: number;
  languagesUsed: string[];
  streakMaintained: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DailyActivitySnapshotSchema = new Schema<IDailyActivitySnapshotDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    gitCommitCount: { type: Number, default: 0 },
    leetCodeCount: { type: Number, default: 0 },
    totalActivities: { type: Number, default: 0 },
    languagesUsed: [{ type: String }],
    streakMaintained: { type: Boolean, default: false }
  },
  { timestamps: true }
);

DailyActivitySnapshotSchema.index({ userId: 1, date: 1 }, { unique: true });
DailyActivitySnapshotSchema.index({ userId: 1, streakMaintained: 1 });

export const DailyActivitySnapshot = mongoose.model<IDailyActivitySnapshotDocument>(
  'DailyActivitySnapshot',
  DailyActivitySnapshotSchema
);

