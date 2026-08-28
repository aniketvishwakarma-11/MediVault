import { Request, Response } from 'express';
import { PushNotificationService } from '../services/push-notification.service';
import { MedicationReminderService } from '../services/medication-reminder.service';
import { query } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export class NotificationController {
  /**
   * GET /api/notifications/vapid-key
   * Public endpoint to get VAPID public key for browser push subscription.
   */
  public static getVapidPublicKey(req: Request, res: Response): void {
    try {
      const publicKey = PushNotificationService.getPublicKey();
      sendSuccess(res, 200, { publicKey });
    } catch (err: any) {
      logger.error('[NotificationController.getVapidPublicKey] Error:', err);
      sendError(res, 500, 'Failed to retrieve VAPID public key.');
    }
  }

  /**
   * POST /api/notifications/subscribe
   * Saves the browser push subscription.
   */
  public static async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const userId = String((req as any).user?.id || (req as any).user?.userId);
      if (!userId) {
        sendError(res, 401, 'Unauthorized: user session required to register push notifications.');
        return;
      }

      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        sendError(res, 400, 'Invalid push subscription payload.');
        return;
      }

      const userAgent = req.headers['user-agent'] || '';
      await PushNotificationService.saveSubscription(userId, subscription, userAgent);

      sendSuccess(res, 200, { message: 'Push subscription registered successfully.' });
    } catch (err: any) {
      logger.error('[NotificationController.subscribe] Error:', err);
      sendError(res, 500, 'Failed to save push subscription.');
    }
  }

  /**
   * POST /api/notifications/unsubscribe
   * Unregisters browser push subscription.
   */
  public static async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        sendError(res, 400, 'Endpoint is required to unsubscribe.');
        return;
      }

      await PushNotificationService.removeSubscription(endpoint);
      sendSuccess(res, 200, { message: 'Push subscription removed successfully.' });
    } catch (err: any) {
      logger.error('[NotificationController.unsubscribe] Error:', err);
      sendError(res, 500, 'Failed to remove push subscription.');
    }
  }

  /**
   * POST /api/notifications/test
   * Dispatches an instant test push notification to the logged-in user.
   */
  public static async testPush(req: Request, res: Response): Promise<void> {
    try {
      const userId = String((req as any).user?.id || (req as any).user?.userId);
      if (!userId) {
        sendError(res, 401, 'Unauthorized.');
        return;
      }

      const result = await MedicationReminderService.sendTestReminder(userId);
      sendSuccess(res, 200, {
        message:
          result.sent > 0
            ? 'Test notification sent to your device!'
            : 'No active device subscriptions found. Please enable push notifications first.',
        ...result,
      });
    } catch (err: any) {
      logger.error('[NotificationController.testPush] Error:', err);
      sendError(res, 500, 'Failed to send test push notification.');
    }
  }

  /**
   * GET /api/notifications/reminders
   * Fetch active medication reminders for patient.
   */
  public static async getReminders(req: Request, res: Response): Promise<void> {
    try {
      const userId = String((req as any).user?.id || (req as any).user?.userId);
      if (!userId) {
        sendError(res, 401, 'Unauthorized.');
        return;
      }

      // Look up patient_id from user_id
      const patientRes = await query(
        'SELECT id FROM public.patients WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      if (patientRes.rows.length === 0) {
        sendSuccess(res, 200, { reminders: [] });
        return;
      }

      const reminders = await MedicationReminderService.getPatientReminders(patientRes.rows[0].id);
      sendSuccess(res, 200, { reminders });
    } catch (err: any) {
      logger.error('[NotificationController.getReminders] Error:', err);
      sendError(res, 500, 'Failed to retrieve medication reminders.');
    }
  }

  /**
   * POST /api/notifications/reminders/:id/toggle
   * Toggle a medication reminder on or off.
   */
  public static async toggleReminder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      await MedicationReminderService.toggleReminder(String(id), Boolean(isActive));
      sendSuccess(res, 200, { message: `Reminder updated to ${isActive ? 'active' : 'inactive'}.` });
    } catch (err: any) {
      logger.error('[NotificationController.toggleReminder] Error:', err);
      sendError(res, 500, 'Failed to toggle reminder.');
    }
  }

  /**
   * POST /api/notifications/reminders/sync
   * Manually trigger sync of reminders from all patient prescriptions.
   */
  public static async syncReminders(req: Request, res: Response): Promise<void> {
    try {
      const userId = String((req as any).user?.id || (req as any).user?.userId);
      if (!userId) {
        sendError(res, 401, 'Unauthorized.');
        return;
      }

      const patientRes = await query(
        'SELECT id FROM public.patients WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      if (patientRes.rows.length === 0) {
        sendSuccess(res, 200, { synced: 0 });
        return;
      }

      const patientId = patientRes.rows[0].id;
      const rxRes = await query(
        'SELECT id FROM public.prescriptions WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 5',
        [patientId]
      );

      let totalSynced = 0;
      for (const rx of rxRes.rows) {
        const count = await MedicationReminderService.syncPrescriptionReminders(patientId, rx.id);
        totalSynced += count;
      }

      sendSuccess(res, 200, { synced: totalSynced });
    } catch (err: any) {
      logger.error('[NotificationController.syncReminders] Error:', err);
      sendError(res, 500, 'Failed to sync reminders.');
    }
  }
}
