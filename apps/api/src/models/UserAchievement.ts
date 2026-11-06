import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IXpGain {
  timestamp: Date;
  action: string;
  xp: number;
}

export interface IUserAchievementDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  level: number;
  currentXp: number;
  unlockedAchievementKeys: string[];
  unlockedAchievementsMeta: Record<string, { unlockedAt: Date }>;
  recentXpGains: IXpGain[];
  createdAt: Date;
  updatedAt: Date;
}

const XpGainSchema = new Schema<IXpGain>(
  {
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    xp: { type: Number, required: true }
  },
  { _id: false }
);

const UserAchievementSchema = new Schema<IUserAchievementDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    level: { type: Number, default: 1 },
    currentXp: { type: Number, default: 0 },
    unlockedAchievementKeys: [{ type: String }],
    unlockedAchievementsMeta: { type: Schema.Types.Mixed, default: {} },
    recentXpGains: { type: [XpGainSchema], default: [] }
  },
  { timestamps: true }
);

export const UserAchievement =
  mongoose.models.UserAchievement ||
  mongoose.model<IUserAchievementDocument>('UserAchievement', UserAchievementSchema);
