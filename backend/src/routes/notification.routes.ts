import { Router, Request, Response, NextFunction } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import jwt from 'jsonwebtoken';

const router = Router();

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authorization token required.' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object') {
      (req as any).user = {
        id: (decoded as any).id || (decoded as any).sub,
        role: (decoded as any).role || 'patient',
        email: (decoded as any).email,
      };
      next();
      return;
    }
  } catch {
    // fallback
  }
  res.status(401).json({ success: false, error: 'Invalid authentication token.' });
};

// 1. Get VAPID public key (Publicly accessible for client browser)
router.get('/vapid-key', NotificationController.getVapidPublicKey);

// 2. Browser Push Subscriptions
router.post('/subscribe', requireAuth, NotificationController.subscribe);
router.post('/unsubscribe', requireAuth, NotificationController.unsubscribe);

// 3. Send Test Push to Device
router.post('/test', requireAuth, NotificationController.testPush);

// 4. Medication Reminders
router.get('/reminders', requireAuth, NotificationController.getReminders);
router.post('/reminders/:id/toggle', requireAuth, NotificationController.toggleReminder);
router.post('/reminders/sync', requireAuth, NotificationController.syncReminders);

export default router;
