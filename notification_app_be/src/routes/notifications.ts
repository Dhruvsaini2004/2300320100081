import { Router } from 'express';
import { Log } from 'logging-middleware';
import {
  getNotifications,
  markAsRead,
  getUnreadCount,
  syncNotifications,
  addSseClient,
  removeSseClient,
  createNotification,
  bulkNotify
} from '../services/notificationService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await getNotifications(req.query);
    Log('backend', 'info', 'route', `got ${result.notifications.length} notifications`);
    res.json(result);
  } catch (e: any) {
    Log('backend', 'error', 'route', `get failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.get('/token', (req, res) => {
  res.json({ token: process.env.ACCESS_TOKEN || '' });
});

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  addSseClient(res);
  Log('backend', 'info', 'route', 'SSE client connected');

  req.on('close', () => {
    removeSseClient(res);
    Log('backend', 'info', 'route', 'SSE client disconnected');
  });
});

router.patch('/:id/read', async (req, res) => {
  try {
    const updated = await markAsRead(req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    Log('backend', 'info', 'route', `marked ${req.params.id} as read`);
    res.json(updated);
  } catch (e: any) {
    Log('backend', 'error', 'route', `patch failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.get('/unread-count', async (req, res) => {
  const count = await getUnreadCount();
  res.json({ unreadCount: count });
});

router.post('/sync', async (req, res) => {
  await syncNotifications();
  res.json({ message: 'synced' });
});

router.post('/', async (req, res) => {
  try {
    const created = await createNotification(req.body);
    res.status(201).json(created);
  } catch (e: any) {
    Log('backend', 'error', 'route', `create failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.post('/bulk-notify', async (req, res) => {
  try {
    const { student_ids, message, type } = req.body;
    const result = await bulkNotify(student_ids || [], message, type);
    res.json(result);
  } catch (e: any) {
    Log('backend', 'error', 'route', `bulk-notify failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

export default router;
