import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type PushPlatform = 'ios' | 'android' | 'web';

export interface IPushToken {
  userId: string;
  locationId: string;
  token: string;
  platform: PushPlatform;
  deviceName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PushTokenDocument = IPushToken & Document;

const pushTokenSchema = new Schema<PushTokenDocument>(
  {
    userId: { type: String, required: true, index: true },
    locationId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
    deviceName: { type: String },
  },
  { timestamps: true },
);

pushTokenSchema.index({ locationId: 1, userId: 1 });

export const PushToken: Model<PushTokenDocument> =
  mongoose.models.PushToken ?? mongoose.model<PushTokenDocument>('PushToken', pushTokenSchema);
