import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type UserRole = 'agency_admin' | 'staff';

export interface IUser {
  email: string;
  passwordHash: string;
  role: UserRole;
  companyId: string;
  allowedLocationIds: string[];
  /** GHL user id for My Inbox / assignee filters (auto-resolved by email). */
  ghlUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = IUser & Document;

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['agency_admin', 'staff'], required: true },
    companyId: { type: String, required: true },
    allowedLocationIds: { type: [String], default: [] },
    ghlUserId: { type: String },
  },
  { timestamps: true },
);

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>('User', userSchema);
