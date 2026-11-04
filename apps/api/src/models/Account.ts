import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAccountDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  provider: 'github';
  providerAccountId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccountDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true, default: 'github' },
    providerAccountId: { type: String, required: true },
    accessTokenEncrypted: { type: String, required: true },
    refreshTokenEncrypted: { type: String },
    tokenExpiresAt: { type: Date },
    scopes: [{ type: String }]
  },
  { timestamps: true }
);

AccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

export const Account = mongoose.model<IAccountDocument>('Account', AccountSchema);

