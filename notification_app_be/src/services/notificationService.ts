import { Response } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { Log } from 'logging-middleware';
import { v4 as uuidv4 } from 'uuid';

const API_URL = 'http://4.224.186.213/evaluation-service/notifications';

let sseClients: Response[] = [];
let memoryNotifications: any[] = [];

export function addSseClient(res: Response) {
  sseClients.push(res);
}

export function removeSseClient(res: Response) {
  sseClients = sseClients.filter(c => c !== res);
}

export function broadcastNotification(notification: any) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(notification)}\n\n`);
  });
}

export async function syncNotifications() {
  const token = process.env.ACCESS_TOKEN || '';
  const res = await fetch(`${API_URL}?limit=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text();
    Log('backend', 'error', 'service', `API responded ${res.status}: ${text}`);
    return;
  }

  const data: any = await res.json();
  Log('backend', 'info', 'service', `Fetched ${data.notifications ? data.notifications.length : 0} notifications`);
  let syncCount = 0;
  for (const n of data.notifications || []) {
    // 1. Save to MongoDB if connected
    let exists = false;
    if (mongoose.connection.readyState === 1) {
      const dbExists = await Notification.findOne({ externalId: n.ID });
      if (dbExists) exists = true;
    } else {
      exists = memoryNotifications.some(item => item.externalId === n.ID);
    }

    if (!exists) {
      const createdObj = {
        _id: n.ID,
        externalId: n.ID,
        type: n.Type,
        message: n.Message,
        timestamp: new Date(n.Timestamp),
        isRead: false
      };

      // Push to memory cache
      memoryNotifications.push(createdObj);

      if (mongoose.connection.readyState === 1) {
        await Notification.create({
          externalId: n.ID,
          type: n.Type,
          message: n.Message,
          timestamp: new Date(n.Timestamp)
        });
      }

      syncCount++;
      broadcastNotification(createdObj);
    }
  }
  Log('backend', 'info', 'service', `Synced and broadcasted ${syncCount} / ${data.notifications.length} notifications`);
}

export async function getNotifications(query: any) {
  if (mongoose.connection.readyState === 1) {
    const filter: any = {};
    if (query.notification_type) filter.type = query.notification_type;
    if (query.isRead !== undefined) {
      filter.isRead = String(query.isRead) === 'true';
    }

    const limit = parseInt(query.limit) || 20;
    const page = parseInt(query.page) || 1;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter)
    ]);

    return { notifications, total };
  }

  // Fallback to memory cache
  let list = [...memoryNotifications];
  if (query.notification_type) {
    list = list.filter(n => n.type === query.notification_type);
  }
  if (query.isRead !== undefined) {
    const targetIsRead = String(query.isRead) === 'true';
    list = list.filter(n => n.isRead === targetIsRead);
  }

  // Sort by timestamp descending
  list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const limit = parseInt(query.limit) || 20;
  const page = parseInt(query.page) || 1;
  const skip = (page - 1) * limit;

  const paginated = list.slice(skip, skip + limit);
  return { notifications: paginated, total: list.length };
}

export async function markAsRead(id: string) {
  // Mark in memory cache
  const memoryNotif = memoryNotifications.find(n => n._id === id);
  if (memoryNotif) {
    memoryNotif.isRead = true;
  }

  if (mongoose.connection.readyState === 1) {
    return Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
  }

  return memoryNotif;
}

export async function createNotification(data: { type: string; message: string; timestamp?: string }) {
  const id = uuidv4();
  const createdObj = {
    _id: id,
    externalId: id,
    type: data.type,
    message: data.message,
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    isRead: false
  };

  memoryNotifications.push(createdObj);

  if (mongoose.connection.readyState === 1) {
    await Notification.create({
      externalId: id,
      type: data.type,
      message: data.message,
      timestamp: createdObj.timestamp
    });
  }

  broadcastNotification(createdObj);
  Log('backend', 'info', 'service', `Created notification: ${data.message}`);
  return createdObj;
}

export async function bulkNotify(studentIds: any[], message: string, type: string) {
  const count = studentIds.length;
  await createNotification({ type, message });
  Log('backend', 'info', 'service', `notify_all completed for ${count} students`);
  return {
    status: 'success',
    message: 'bulk notifications processed',
    processed_count: count
  };
}

export async function getUnreadCount() {
  if (mongoose.connection.readyState === 1) {
    return Notification.countDocuments({ isRead: false });
  }
  return memoryNotifications.filter(n => !n.isRead).length;
}

// Start polling loop to fetch and broadcast new notifications every 15 seconds
setInterval(() => {
  syncNotifications().catch(err => {
    Log('backend', 'error', 'service', `Periodic sync failed: ${err.message}`);
  });
}, 15000);
