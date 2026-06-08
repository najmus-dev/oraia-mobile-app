import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IPushDedup {
  messageId: string;
  locationId: string;
  conversationId: string;
  createdAt: Date;
}

export type PushDedupDocument = IPushDedup & Document;

const pushDedupSchema = new Schema<PushDedupDocument>(
  {
    messageId: { type: String, required: true, unique: true, index: true },
    locationId: { type: String, required: true },
    conversationId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

pushDedupSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const PushDedup: Model<PushDedupDocument> =
  mongoose.models.PushDedup ?? mongoose.model<PushDedupDocument>('PushDedup', pushDedupSchema);
