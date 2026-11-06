import mongoose, { Schema, Document } from 'mongoose';

export interface IRevokedTokenDoc extends Document {
  jti: string;
  revokedAt: Date;
  expiresAt: Date;
}

const RevokedTokenSchema = new Schema<IRevokedTokenDoc>(
  {
    jti: { type: String, required: true, unique: true, index: true },
    revokedAt: { type: Date, default: Date.now },
    // MongoDB TTL index: Document automatically removed by MongoDB once expiresAt is reached
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

export const RevokedToken =
  mongoose.models.RevokedToken ||
  mongoose.model<IRevokedTokenDoc>('RevokedToken', RevokedTokenSchema);

