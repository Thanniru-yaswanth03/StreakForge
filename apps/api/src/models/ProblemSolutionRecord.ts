import mongoose, { Schema, Document, Types } from 'mongoose';
import type { Difficulty, SolutionApproach } from '@streakforge/shared-types';

export interface IProblemSolutionRecordDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  questionSlug: string;
  questionTitle: string;
  difficulty: Difficulty;
  approaches: SolutionApproach[];
  optimalTimeComplexity: string;
  optimalSpaceComplexity: string;
  patterns: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SolutionApproachSchema = new Schema<SolutionApproach>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    timeComplexity: { type: String, required: true },
    spaceComplexity: { type: String, required: true },
    language: { type: String, default: 'javascript' },
    code: { type: String, default: '' },
    explanation: { type: String, default: '' },
    tradeoffs: { type: String, default: '' },
    isOptimal: { type: Boolean, default: false }
  },
  { _id: false }
);

const ProblemSolutionRecordSchema = new Schema<IProblemSolutionRecordDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionSlug: { type: String, required: true, index: true },
    questionTitle: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    approaches: [SolutionApproachSchema],
    optimalTimeComplexity: { type: String, default: 'O(n)' },
    optimalSpaceComplexity: { type: String, default: 'O(1)' },
    patterns: [{ type: String }]
  },
  { timestamps: true }
);

ProblemSolutionRecordSchema.index({ userId: 1, questionSlug: 1 }, { unique: true });

export const ProblemSolutionRecord =
  mongoose.models.ProblemSolutionRecord ||
  mongoose.model<IProblemSolutionRecordDocument>('ProblemSolutionRecord', ProblemSolutionRecordSchema);
