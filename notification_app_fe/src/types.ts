export interface Notification {
  _id: string;
  externalId: string;
  type: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}
