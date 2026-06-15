import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ICompanyToken {
  companyId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresAt: Date;
  refreshTokenId?: string;
  /** Cross-instance mutex so only one refresh uses a single-use GHL refresh token. */
  refreshLockUntil?: Date;
  lastRefreshAt?: Date;
  lastRefreshError?: string;
  updatedAt: Date;
}

export type CompanyTokenDocument = ICompanyToken & Document;

const companyTokenSchema = new Schema<CompanyTokenDocument>(
  {
    companyId: { type: String, required: true, unique: true },
    accessTokenEncrypted: { type: String, required: true },
    refreshTokenEncrypted: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    refreshTokenId: { type: String },
    refreshLockUntil: { type: Date },
    lastRefreshAt: { type: Date },
    lastRefreshError: { type: String },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const CompanyToken: Model<CompanyTokenDocument> =
  mongoose.models.CompanyToken ??
  mongoose.model<CompanyTokenDocument>('CompanyToken', companyTokenSchema);
