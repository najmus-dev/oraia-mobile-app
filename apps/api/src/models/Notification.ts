import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { NotificationAction, NotificationType } from '../lib/notificationTypes';

export interface INotification {
  locationId: string;
  type: NotificationType;
  status: 'read' | 'unread';
  title: string;
  body: string;
  dedupeKey: string;
  /** GHL user id — when set, only staff with matching ghlUserId (or agency_admin) sees it. */
  targetGhlUserId?: string;
  action: NotificationAction;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = INotification & Document;

const actionSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ['conversation', 'appointment', 'task', 'contact', 'opportunity', 'none'],
      default: 'none',
    },
    conversationId: String,
    contactId: String,
    appointmentId: String,
    taskId: String,
    taskContactId: String,
    opportunityId: String,
  },
  { _id: false },
);

const notificationSchema = new Schema<NotificationDocument>(
  {
    locationId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['conversations', 'appointments', 'tasks', 'reputation', 'social_planner', 'custom'],
      required: true,
      index: true,
    },
    status: { type: String, enum: ['read', 'unread'], default: 'unread', index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    dedupeKey: { type: String, required: true, unique: true },
    targetGhlUserId: { type: String, index: true },
    action: { type: actionSchema, default: () => ({ kind: 'none' }) },
    readAt: Date,
  },
  { timestamps: true },
);

notificationSchema.index({ locationId: 1, createdAt: -1 });
notificationSchema.index({ locationId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Notification: Model<NotificationDocument> =
  mongoose.models.Notification ??
  mongoose.model<NotificationDocument>('Notification', notificationSchema);
