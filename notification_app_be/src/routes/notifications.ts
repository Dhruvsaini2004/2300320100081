import { Router } from 'express';
import { Log } from 'logging-middleware';
import { getNotifications, markAsRead, getUnreadCount, syncNotifications } from '../services/notificationService';

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

export default router;
