import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IKnowledgeNoteDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  content: string;
  tags: string[];
  folder: string;
  linkedProblemSlug?: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeNoteSchema = new Schema<IKnowledgeNoteDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    tags: [{ type: String, trim: true }],
    folder: { type: String, default: 'General', index: true },
    linkedProblemSlug: { type: String, trim: true, index: true },
    isPinned: { type: Boolean, default: false }
  },
  { timestamps: true }
);

KnowledgeNoteSchema.index({ userId: 1, tags: 1 });
KnowledgeNoteSchema.index({ userId: 1, title: 'text', content: 'text' });

export const KnowledgeNote =
  mongoose.models.KnowledgeNote ||
  mongoose.model<IKnowledgeNoteDocument>('KnowledgeNote', KnowledgeNoteSchema);

