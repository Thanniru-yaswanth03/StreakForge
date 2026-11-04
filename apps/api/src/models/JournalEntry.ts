import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IJournalEntryDoc extends Document {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  notes: string;
  codingDurationMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const JournalEntrySchema = new Schema<IJournalEntryDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    notes: { type: String, default: '' },
    codingDurationMinutes: { type: Number }
  },
  {
    timestamps: true,
    collection: 'journal_entries'
  }
);

JournalEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

export const JournalEntry = mongoose.model<IJournalEntryDoc>(
  'JournalEntry',
  JournalEntrySchema
);

