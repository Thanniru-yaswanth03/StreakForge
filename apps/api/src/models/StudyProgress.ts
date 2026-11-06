import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import type { Difficulty, StudyProblemStatus, SrsRating } from '@streakforge/shared-types';

export interface IStudyProgressDocument extends Document {
  userId: Types.ObjectId;
  problemId: number;
  questionSlug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  curricula: string[];
  status: StudyProblemStatus;
  userNotes?: string;
  repetitionLevel: number;
  easeFactor: number;
  intervalDays: number;
  lastReviewedAt?: Date;
  nextReviewDate: string; // YYYY-MM-DD
  history: Array<{
    reviewedAt: Date;
    rating: SrsRating;
    intervalDays: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const StudyProgressSchema = new Schema<IStudyProgressDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problemId: { type: Number, required: true, index: true },
    questionSlug: { type: String, required: true, index: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    category: { type: String, required: true, index: true },
    curricula: [{ type: String }],
    status: {
      type: String,
      enum: ['NOT_STARTED', 'ATTEMPTED', 'SOLVED', 'NEEDS_REVISION', 'MASTERED'],
      default: 'NOT_STARTED',
      index: true
    },
    userNotes: { type: String, default: '' },
    repetitionLevel: { type: Number, default: 0 },
    easeFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 1 },
    lastReviewedAt: { type: Date },
    nextReviewDate: { type: String, required: true, index: true },
    history: [
      {
        reviewedAt: { type: Date, default: Date.now },
        rating: { type: String, enum: ['AGAIN', 'HARD', 'GOOD', 'EASY'] },
        intervalDays: { type: Number, required: true }
      }
    ]
  },
  { timestamps: true }
);

StudyProgressSchema.index({ userId: 1, questionSlug: 1 }, { unique: true });
StudyProgressSchema.index({ userId: 1, nextReviewDate: 1, status: 1 });

export const StudyProgress: Model<IStudyProgressDocument> =
  mongoose.models.StudyProgress ||
  mongoose.model<IStudyProgressDocument>('StudyProgress', StudyProgressSchema);

