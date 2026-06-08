import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ILocationToken {
  locationId: string;
  companyId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresAt: Date;
  updatedAt: Date;
}

export type LocationTokenDocument = ILocationToken & Document;

const locationTokenSchema = new Schema<LocationTokenDocument>(
  {
    locationId: { type: String, required: true, unique: true },
    companyId: { type: String, required: true },
    accessTokenEncrypted: { type: String, required: true },
    refreshTokenEncrypted: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const LocationToken: Model<LocationTokenDocument> =
  mongoose.models.LocationToken ??
  mongoose.model<LocationTokenDocument>('LocationToken', locationTokenSchema);
