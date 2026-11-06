import mongoose, { Schema, Document, Types } from 'mongoose';
import type { Difficulty, InterviewDifficulty } from '@streakforge/shared-types';

export interface IMockProblem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  solved: boolean;
  notes?: string;
}

export interface IMockInterviewSessionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  track: string;
  difficulty: InterviewDifficulty;
  timeLimitMinutes: number;
  timeSpentSeconds: number;
  problems: IMockProblem[];
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  scorePercent: number;
  feedback: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MockProblemSchema = new Schema<IMockProblem>(
  {
    id: { type: Number, required: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    solved: { type: Boolean, default: false },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const MockInterviewSessionSchema = new Schema<IMockInterviewSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    track: { type: String, default: 'Blind 75' },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD', 'RANDOM'], default: 'MEDIUM' },
    timeLimitMinutes: { type: Number, default: 45 },
    timeSpentSeconds: { type: Number, default: 0 },
    problems: [MockProblemSchema],
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'], default: 'IN_PROGRESS' },
    scorePercent: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

MockInterviewSessionSchema.index({ userId: 1, createdAt: -1 });

export const MockInterviewSession =
  mongoose.models.MockInterviewSession ||
  mongoose.model<IMockInterviewSessionDocument>('MockInterviewSession', MockInterviewSessionSchema);

