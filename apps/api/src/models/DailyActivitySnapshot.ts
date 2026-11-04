import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDailyActivitySnapshotDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD format in user's timezone

  // Category breakdown (Never merge these into a false count)
  github: {
    commits: number;
    prs: number;
    issues: number;
    other: number;
  };
  leetcode: {
    submissions: number;
    accepted: number;
    uniqueProblems: number;
  };
  localDev: {
    sessions: number;
    filesChanged: number;
    activeMinutes: number;
  };
  maintenance: {
    backups: number;
    dependencyUpdates: number;
    docsSync: number;
  };

  // Eligibility flags per category
  githubStreakEligible: boolean;
  leetCodeStreakEligible: boolean;
  localDevStreakEligible: boolean;
  overallStreakEligible: boolean;

  // Legacy / top-level aggregates
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

    github: {
      commits: { type: Number, default: 0 },
      prs: { type: Number, default: 0 },
      issues: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    leetcode: {
      submissions: { type: Number, default: 0 },
      accepted: { type: Number, default: 0 },
      uniqueProblems: { type: Number, default: 0 }
    },
    localDev: {
      sessions: { type: Number, default: 0 },
      filesChanged: { type: Number, default: 0 },
      activeMinutes: { type: Number, default: 0 }
    },
    maintenance: {
      backups: { type: Number, default: 0 },
      dependencyUpdates: { type: Number, default: 0 },
      docsSync: { type: Number, default: 0 }
    },

    githubStreakEligible: { type: Boolean, default: false },
    leetCodeStreakEligible: { type: Boolean, default: false },
    localDevStreakEligible: { type: Boolean, default: false },
    overallStreakEligible: { type: Boolean, default: false },

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
DailyActivitySnapshotSchema.index({ userId: 1, githubStreakEligible: 1 });
DailyActivitySnapshotSchema.index({ userId: 1, leetCodeStreakEligible: 1 });

export const DailyActivitySnapshot = mongoose.model<IDailyActivitySnapshotDocument>(
  'DailyActivitySnapshot',
  DailyActivitySnapshotSchema
);
