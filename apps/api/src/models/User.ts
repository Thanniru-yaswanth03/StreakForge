import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  githubId: string;
  username: string;
  name: string;
  email: string;
  verifiedEmails: string[];
  avatarUrl: string;
  timezone: string;
  streakGoalPerDay: number;
  notificationPreferences: {
    inApp: boolean;
    email: boolean;
    streakWarningHoursBefore: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    email: { type: String, required: true, unique: true, index: true },
    verifiedEmails: [{ type: String }],
    avatarUrl: { type: String, default: '' },
    timezone: { type: String, default: 'UTC' },
    streakGoalPerDay: { type: Number, default: 1 },
    notificationPreferences: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      streakWarningHoursBefore: { type: Number, default: 3 }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUserDocument>('User', UserSchema);

