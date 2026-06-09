import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  externalId: string;
  type: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

const notificationSchema = new Schema<INotification>({
  externalId: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['Event', 'Result', 'Placement'] },
  message: { type: String, required: true },
  timestamp: { type: Date, required: true },
  isRead: { type: Boolean, default: false }
});

notificationSchema.index({ type: 1, timestamp: -1 });
notificationSchema.index({ isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
