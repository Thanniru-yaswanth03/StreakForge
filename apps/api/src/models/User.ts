import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  DEFAULT_CONFIG,
  DEFAULT_UI_ENABLED_MODULES,
  DEFAULT_SIDEBAR_ORDER
} from '@streakforge/config';
import type { UserSyncPreferences, UserUiPreferences } from '@streakforge/shared-types';

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
    browser?: boolean;
    problemSolved?: boolean;
    syncSuccess?: boolean;
    syncFailure?: boolean;
    dailySummary?: boolean;
    weeklyReport?: boolean;
    streakWarning?: boolean;
    streakWarningHoursBefore: number;
  };
  syncPreferences: UserSyncPreferences;
  uiPreferences: UserUiPreferences;
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
      browser: { type: Boolean, default: true },
      problemSolved: { type: Boolean, default: true },
      syncSuccess: { type: Boolean, default: true },
      syncFailure: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
      streakWarning: { type: Boolean, default: true },
      streakWarningHoursBefore: { type: Number, default: 3 }
    },
    syncPreferences: {
      autoSyncEnabled: { type: Boolean, default: true },
      exportPolicy: {
        type: String,
        enum: ['NEW_ONLY', 'LATEST_ONLY', 'ALLOW_MULTIPLE'],
        default: 'ALLOW_MULTIPLE'
      },
      autoCommit: { type: Boolean, default: true },
      folderPattern: { type: String, default: DEFAULT_CONFIG.DEFAULT_SOLUTION_PATH },
      fileNamingPattern: { type: String, default: DEFAULT_CONFIG.DEFAULT_FILE_NAMING_PATTERN },
      zeroPadId: { type: Number, default: 0 },
      includeHeader: { type: Boolean, default: true },
      includeMetrics: { type: Boolean, default: true },
      includeReadme: { type: Boolean, default: true },
      preserveOriginalCode: { type: Boolean, default: false }
    },
    uiPreferences: {
      enabledModules: { type: [String], default: () => [...DEFAULT_UI_ENABLED_MODULES] },
      sidebarOrder: { type: [String], default: () => [...DEFAULT_SIDEBAR_ORDER] },
      compactSidebar: { type: Boolean, default: false },
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
      customized: { type: Boolean, default: false }
    },
    leetcodeUsername: { type: String, default: null },
    leetcodeStats: { type: Schema.Types.Mixed, default: null },
    bio: { type: String, default: '' },
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

