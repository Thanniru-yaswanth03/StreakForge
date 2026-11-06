import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILeetCodeUserStats {
  username: string;
  realName?: string;
  ranking?: number;
  userAvatar?: string;
  reputation?: number;
  aboutMe?: string;
  countryName?: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  acceptanceRate: number;
  totalActiveDays?: number;
  maxStreak?: number;
  submissionCalendar?: string;
  badgesCount?: number;
  easyTotal?: number;
  mediumTotal?: number;
  hardTotal?: number;
  lastSyncedAt: Date;
}

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
  leetcodeUsername?: string;
  leetcodeStats?: ILeetCodeUserStats;
  bio?: string;
  codeforcesUsername?: string;
  codechefUsername?: string;
  isPublicProfile: boolean;
  publicProfileSettings: {
    showStreak: boolean;
    showHeatmap: boolean;
    showWeaknesses: boolean;
    showBadges: boolean;
    showSolutions: boolean;
  };
  gamificationEnabled: boolean;
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
    leetcodeUsername: { type: String, default: 'yash1th2k4' },
    leetcodeStats: { type: Schema.Types.Mixed, default: null },
    bio: { type: String, default: 'Full-stack builder & algorithm practitioner.' },
    codeforcesUsername: { type: String, default: '' },
    codechefUsername: { type: String, default: '' },
    isPublicProfile: { type: Boolean, default: true, index: true },
    publicProfileSettings: {
      showStreak: { type: Boolean, default: true },
      showHeatmap: { type: Boolean, default: true },
      showWeaknesses: { type: Boolean, default: true },
      showBadges: { type: Boolean, default: true },
      showSolutions: { type: Boolean, default: true }
    },
    gamificationEnabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUserDocument>('User', UserSchema);

