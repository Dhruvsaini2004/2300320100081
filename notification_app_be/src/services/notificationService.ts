import { Notification } from '../models/Notification';
import { Log } from 'logging-middleware';

const API_URL = 'http://4.224.186.213/evaluation-service/notifications';

export async function syncNotifications() {
  const token = process.env.ACCESS_TOKEN || '';
  const res = await fetch(`${API_URL}?limit=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    Log('backend', 'error', 'service', `API responded ${res.status}`);
    return;
  }

  const data: any = await res.json();
  for (const n of data.notifications) {
    const exists = await Notification.findOne({ externalId: n.ID });
    if (!exists) {
      await Notification.create({
        externalId: n.ID,
        type: n.Type,
        message: n.Message,
        timestamp: new Date(n.Timestamp)
      });
    }
  }
  Log('backend', 'info', 'service', `Synced ${data.notifications.length} notifications`);
}

export async function getNotifications(query: any) {
  const filter: any = {};
  if (query.notification_type) filter.type = query.notification_type;
  if (query.isRead !== undefined) filter.isRead = query.isRead;

  const limit = parseInt(query.limit) || 20;
  const page = parseInt(query.page) || 1;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter)
  ]);

  return { notifications, total };
}

export async function markAsRead(id: string) {
  return Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
}

export async function getUnreadCount() {
  return Notification.countDocuments({ isRead: false });
}
