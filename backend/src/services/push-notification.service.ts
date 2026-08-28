import webpush from 'web-push';
import { query } from '../config/db';
import { logger } from '../utils/logger';

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BO_Ba9LTDjXh19w5e5cetxH3S37IDNEn0d6Zxu4clHNkMt20G6vXHqMpKRpG4rWAk0kmQpkss_ty3PeUykOWqiU';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'OAtK6H3V1eimEzJdlaaYhx_qkeCXVepR9zcdoyWXRtM';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@medivault.health';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info('[PushNotificationService] VAPID details configured successfully.');
} catch (err) {
  logger.error('[PushNotificationService] Failed to initialize VAPID details:', err);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  data?: Record<string, any>;
}

export class PushNotificationService {
  /**
   * Return the public VAPID key required for client-side subscription.
   */
  static getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Store or update a user's browser push subscription.
   */
  static async saveSubscription(
    userId: string,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
    userAgent?: string
  ): Promise<void> {
    const { endpoint, keys } = subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid push subscription payload: missing endpoint or cryptographic keys.');
    }

    const sql = `
      INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (endpoint) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          user_agent = EXCLUDED.user_agent,
          updated_at = NOW();
    `;

    await query(sql, [userId, endpoint, keys.p256dh, keys.auth, userAgent || null]);
    logger.info(`[PushNotificationService] Saved push subscription for user ${userId}`);
  }

  /**
   * Remove a push subscription when a user opts out.
   */
  static async removeSubscription(endpoint: string): Promise<void> {
    await query('DELETE FROM public.push_subscriptions WHERE endpoint = $1', [endpoint]);
    logger.info(`[PushNotificationService] Removed push subscription for endpoint.`);
  }

  /**
   * Send a Web Push notification to all active devices registered by a specific user.
   */
  static async sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
    try {
      const res = await query(
        'SELECT id, endpoint, p256dh, auth FROM public.push_subscriptions WHERE user_id = $1',
        [userId]
      );

      // Also record in in-app notifications center
      try {
        await query(
          `INSERT INTO public.notifications (recipient_id, title, message, delivery_channel, metadata)
           VALUES ($1, $2, $3, 'PUSH', $4)`,
          [userId, payload.title, payload.body, JSON.stringify(payload)]
        );
      } catch (logErr) {
        logger.warn('[PushNotificationService] Failed to record in-app notification:', logErr);
      }

      if (res.rows.length === 0) {
        logger.info(`[PushNotificationService] User ${userId} has no registered push subscriptions.`);
        return { sent: 0, failed: 0 };
      }

      let sentCount = 0;
      let failedCount = 0;

      const notificationData = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192.png',
        badge: '/icons/icon.svg',
        url: payload.url || '/',
        tag: payload.tag || 'medivault-alert',
        data: payload.data || {},
      });

      for (const row of res.rows) {
        const pushSubscription = {
          endpoint: row.endpoint,
          keys: {
            p256dh: row.p256dh,
            auth: row.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationData);
          sentCount++;
        } catch (err: any) {
          failedCount++;
          logger.warn(`[PushNotificationService] Push delivery failed for endpoint ${row.id}:`, err.statusCode || err.message);

          // 404 or 410 means the subscription is expired or unsubscribed by the user
          if (err.statusCode === 404 || err.statusCode === 410) {
            logger.info(`[PushNotificationService] Purging expired push subscription ${row.id}`);
            await query('DELETE FROM public.push_subscriptions WHERE id = $1', [row.id]).catch(() => {});
          }
        }
      }

      logger.info(`[PushNotificationService] Sent to user ${userId}: ${sentCount} succeeded, ${failedCount} failed.`);
      return { sent: sentCount, failed: failedCount };
    } catch (error) {
      logger.error(`[PushNotificationService] Error sending push to user ${userId}:`, error);
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Broadcast a push notification to all users belonging to a specific role (PATIENT, DOCTOR, ADMIN).
   */
  static async sendToRole(role: string, payload: PushPayload): Promise<void> {
    try {
      const sql = `
        SELECT DISTINCT ps.endpoint, ps.p256dh, ps.auth, ps.id
        FROM public.push_subscriptions ps
        JOIN public.users_profile up ON up.user_id = ps.user_id
        WHERE UPPER(up.role) = UPPER($1)
      `;
      const res = await query(sql, [role]);

      const notificationData = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192.png',
        badge: '/icons/icon.svg',
        url: payload.url || '/',
        tag: payload.tag || 'medivault-broadcast',
      });

      for (const row of res.rows) {
        const pushSubscription = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };
        webpush.sendNotification(pushSubscription, notificationData).catch((err) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            query('DELETE FROM public.push_subscriptions WHERE id = $1', [row.id]).catch(() => {});
          }
        });
      }
    } catch (err) {
      logger.error(`[PushNotificationService] Error broadcasting to role ${role}:`, err);
    }
  }
}
