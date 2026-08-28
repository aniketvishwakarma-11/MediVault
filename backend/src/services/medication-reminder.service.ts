import { query } from '../config/db';
import { logger } from '../utils/logger';
import { PushNotificationService } from './push-notification.service';

export interface MedicationReminder {
  id: string;
  patient_id: string;
  prescription_id?: string;
  drug_name: string;
  dosage?: string;
  reminder_time: string;
  instructions?: string;
  is_active: boolean;
  last_sent_at?: string;
}

export class MedicationReminderService {
  /**
   * Fetch all active and inactive medication reminders for a patient.
   */
  static async getPatientReminders(patientId: string): Promise<MedicationReminder[]> {
    const sql = `
      SELECT 
        id, 
        patient_id, 
        prescription_id, 
        drug_name, 
        dosage, 
        TO_CHAR(reminder_time, 'HH24:MI') as reminder_time,
        instructions, 
        is_active, 
        last_sent_at
      FROM public.medication_reminders
      WHERE patient_id = $1
      ORDER BY reminder_time ASC
    `;
    const res = await query(sql, [patientId]);
    return res.rows;
  }

  /**
   * Toggle a reminder active/inactive.
   */
  static async toggleReminder(reminderId: string, isActive: boolean): Promise<void> {
    await query(
      'UPDATE public.medication_reminders SET is_active = $1 WHERE id = $2',
      [isActive, reminderId]
    );
  }

  /**
   * Automatically generate daily reminders from a saved prescription's items.
   */
  static async syncPrescriptionReminders(patientId: string, prescriptionId: string): Promise<number> {
    try {
      const itemsRes = await query(
        `SELECT drug_name, strength, schedule_code, food_instructions 
         FROM public.prescription_items 
         WHERE prescription_id = $1`,
        [prescriptionId]
      );

      let createdCount = 0;

      for (const item of itemsRes.rows) {
        const schedule = (item.schedule_code || '1-0-1').toUpperCase();
        const times: { time: string; label: string }[] = [];

        // Parse slot patterns e.g. "1-0-1" or "1-1-1"
        if (schedule.includes('-')) {
          const parts = schedule.split('-').map((p: string) => p.trim());
          if (parts[0] === '1') times.push({ time: '08:00:00', label: 'Morning dose' });
          if (parts[1] === '1') times.push({ time: '13:00:00', label: 'Afternoon dose' });
          if (parts[2] === '1') times.push({ time: '20:00:00', label: 'Evening / Bedtime dose' });
        } else if (schedule === 'OD' || schedule === 'ONCE') {
          times.push({ time: '08:00:00', label: 'Daily morning dose' });
        } else if (schedule === 'BD' || schedule === 'BID') {
          times.push({ time: '08:00:00', label: 'Morning dose' });
          times.push({ time: '20:00:00', label: 'Evening dose' });
        } else if (schedule === 'TDS' || schedule === 'TID') {
          times.push({ time: '08:00:00', label: 'Morning dose' });
          times.push({ time: '13:00:00', label: 'Afternoon dose' });
          times.push({ time: '20:00:00', label: 'Evening dose' });
        } else {
          // Default to morning
          times.push({ time: '08:00:00', label: 'Daily dose' });
        }

        for (const slot of times) {
          const instructionText = item.food_instructions
            ? `${slot.label} · ${item.food_instructions}`
            : slot.label;

          // Check if identical reminder already exists
          const existing = await query(
            `SELECT id FROM public.medication_reminders 
             WHERE patient_id = $1 AND drug_name = $2 AND reminder_time = $3`,
            [patientId, item.drug_name, slot.time]
          );

          if (existing.rows.length === 0) {
            await query(
              `INSERT INTO public.medication_reminders 
               (patient_id, prescription_id, drug_name, dosage, reminder_time, instructions, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
              [patientId, prescriptionId, item.drug_name, item.strength || '', slot.time, instructionText]
            );
            createdCount++;
          }
        }
      }

      logger.info(`[MedicationReminderService] Synchronized ${createdCount} reminders for patient ${patientId}`);
      return createdCount;
    } catch (err) {
      logger.error('[MedicationReminderService] Failed to sync prescription reminders:', err);
      return 0;
    }
  }

  /**
   * Send an instant test reminder to verify push notifications.
   */
  static async sendTestReminder(userId: string): Promise<{ sent: number; failed: number }> {
    return PushNotificationService.sendToUser(userId, {
      title: '💊 MediVault Rx Reminder (Test)',
      body: 'Time to take your scheduled dose: Metformin 500mg (Take after meals).',
      url: '/patient/prescriptions',
      tag: 'medication-test',
    });
  }

  /**
   * Dispatch reminders that match the current time window.
   */
  static async dispatchDueReminders(): Promise<number> {
    try {
      // Find active reminders where reminder_time is within current hour and minute
      const sql = `
        SELECT 
          mr.id,
          mr.drug_name,
          mr.dosage,
          mr.instructions,
          p.user_id
        FROM public.medication_reminders mr
        JOIN public.patients p ON p.id = mr.patient_id
        WHERE mr.is_active = TRUE
          AND mr.reminder_time >= (CURRENT_TIME - INTERVAL '10 minutes')
          AND mr.reminder_time <= (CURRENT_TIME + INTERVAL '10 minutes')
          AND (mr.last_sent_at IS NULL OR mr.last_sent_at < CURRENT_DATE)
      `;
      const res = await query(sql);

      let dispatched = 0;
      for (const row of res.rows) {
        if (!row.user_id) continue;

        await PushNotificationService.sendToUser(row.user_id, {
          title: `💊 Medication Reminder: ${row.drug_name}`,
          body: `${row.dosage ? row.dosage + ' — ' : ''}${row.instructions || 'Time to take your medication.'}`,
          url: '/patient/prescriptions',
          tag: `med-reminder-${row.id}`,
        });

        await query(
          'UPDATE public.medication_reminders SET last_sent_at = NOW() WHERE id = $1',
          [row.id]
        );
        dispatched++;
      }

      if (dispatched > 0) {
        logger.info(`[MedicationReminderService] Dispatched ${dispatched} medication reminders.`);
      }
      return dispatched;
    } catch (err) {
      logger.error('[MedicationReminderService] Error dispatching reminders:', err);
      return 0;
    }
  }
}
