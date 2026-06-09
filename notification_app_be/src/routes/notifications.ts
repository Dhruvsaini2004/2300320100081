import { Router, Request, Response } from 'express';
import { Log } from 'logging-middleware';
import { getNotifications, markAsRead, getUnreadCount, syncNotifications } from '../services/notificationService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await getNotifications(req.query);
    Log('backend', 'info', 'route', `GET /notifications returned ${result.notifications.length} items`);
    res.json(result);
  } catch (err: any) {
    Log('backend', 'error', 'route', `GET /notifications failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await markAsRead(id);
    if (!updated) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    Log('backend', 'info', 'route', `PATCH /notifications/${id}/read - marked as read`);
    res.json(updated);
  } catch (err: any) {
    Log('backend', 'error', 'route', `PATCH failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count', async (_req: Request, res: Response) => {
  const count = await getUnreadCount();
  res.json({ unreadCount: count });
});

router.post('/sync', async (_req: Request, res: Response) => {
  await syncNotifications();
  res.json({ message: 'Sync complete' });
});

export default router;
