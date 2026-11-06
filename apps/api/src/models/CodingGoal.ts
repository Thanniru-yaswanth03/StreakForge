import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRoutineItem {
  dayOfWeek: string;
  focusTopics: string[];
  targetCount: number;
  revisionMinutes: number;
}

export interface ICodingGoalDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  dailyTarget: {
    easy: number;
    medium: number;
    hard: number;
    revisionMinutes: number;
  };
  weeklyTarget: number;
  studyRoutines: IRoutineItem[];
  completedToday: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
    revisionCount: number;
  };
  completedThisWeek: number;
  weekStartDate: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoutineItemSchema = new Schema<IRoutineItem>(
  {
    dayOfWeek: { type: String, required: true },
    focusTopics: [{ type: String }],
    targetCount: { type: Number, default: 2 },
    revisionMinutes: { type: Number, default: 20 }
  },
  { _id: false }
);

const CodingGoalSchema = new Schema<ICodingGoalDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    dailyTarget: {
      easy: { type: Number, default: 1 },
      medium: { type: Number, default: 2 },
      hard: { type: Number, default: 0 },
      revisionMinutes: { type: Number, default: 25 }
    },
    weeklyTarget: { type: Number, default: 15 },
    studyRoutines: {
      type: [RoutineItemSchema],
      default: [
        { dayOfWeek: 'Monday', focusTopics: ['Arrays', 'Two Pointers'], targetCount: 2, revisionMinutes: 20 },
        { dayOfWeek: 'Tuesday', focusTopics: ['Sliding Window', 'Binary Search'], targetCount: 2, revisionMinutes: 20 },
        { dayOfWeek: 'Wednesday', focusTopics: ['Linked Lists', 'Trees'], targetCount: 2, revisionMinutes: 20 },
        { dayOfWeek: 'Thursday', focusTopics: ['Graphs', 'BFS/DFS'], targetCount: 2, revisionMinutes: 20 },
        { dayOfWeek: 'Friday', focusTopics: ['Dynamic Programming', 'Backtracking'], targetCount: 2, revisionMinutes: 20 },
        { dayOfWeek: 'Saturday', focusTopics: ['Weakness Revisions', 'Mock Practice'], targetCount: 3, revisionMinutes: 30 },
        { dayOfWeek: 'Sunday', focusTopics: ['Weekly Review & Knowledge Vault'], targetCount: 1, revisionMinutes: 15 }
      ]
    },
    completedToday: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      revisionCount: { type: Number, default: 0 }
    },
    completedThisWeek: { type: Number, default: 0 },
    weekStartDate: { type: String, default: () => new Date().toISOString().slice(0, 10) }
  },
  { timestamps: true }
);

export const CodingGoal =
  mongoose.models.CodingGoal ||
  mongoose.model<ICodingGoalDocument>('CodingGoal', CodingGoalSchema);
