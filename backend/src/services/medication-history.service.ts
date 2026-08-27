import { query } from '../config/db';
import { logger } from '../utils/logger';

/**
 * MediVault V2 — Medication History Service
 *
 * Reconstructs a patient's longitudinal medication timeline from clinical_events.
 * Uses 'last_recorded' status unless an explicit discontinuation is documented.
 */

export interface MedicationDosePoint {
  event_id: string;
  document_id: string | null;
  event_date: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  purpose: string | null;
  instructions: string | null;
  status: string;
  facility_name: string | null;
  doctor_name: string | null;
}

export interface MedicationHistoryEntry {
  medication_name: string;
  normalized_name: string;
  dose_timeline: MedicationDosePoint[];
  first_recorded: string;
  last_recorded: string;
  /** 'active' | 'last_recorded' | 'discontinued' */
  current_status: string;
  dose_changes: number;
}

export class MedicationHistoryService {
  public static async getPatientMedicationHistory(patientId: string): Promise<MedicationHistoryEntry[]> {
    try {
      const res = await query(
        `SELECT
           ce.id as event_id,
           ce.document_id,
           ce.event_date::text,
           ce.doctor_name,
           ce.facility_name,
           med_item->>'name' as med_name,
           med_item->>'dosage' as dosage,
           med_item->>'frequency' as frequency,
           med_item->>'route' as route,
           med_item->>'purpose' as purpose,
           med_item->>'instructions' as instructions,
           COALESCE(med_item->>'status', 'last_recorded') as status,
           med_item->>'start_date' as start_date
         FROM public.clinical_events ce,
              jsonb_array_elements(ce.structured_data->'medications') as med_item
         WHERE (ce.patient_id = $1 OR ce.patient_id IN (SELECT id FROM public.patients WHERE user_id = $1) OR ce.patient_id IN (SELECT user_id FROM public.patients WHERE id = $1))
           AND ce.event_type IN ('PRESCRIPTION', 'MEDICATION_CHANGE')
         ORDER BY ce.event_date ASC`,
        [patientId]
      );

      if (res.rows.length === 0) return [];

      // Group by normalized medication name
      const groups = new Map<string, { name: string; points: MedicationDosePoint[] }>();

      for (const row of res.rows) {
        if (!row.med_name) continue;
        const normalized = this.normalizeMedName(row.med_name);
        if (!groups.has(normalized)) {
          groups.set(normalized, { name: row.med_name, points: [] });
        }
        groups.get(normalized)!.points.push({
          event_id: row.event_id,
          document_id: row.document_id,
          event_date: row.start_date || row.event_date,
          dosage: row.dosage || null,
          frequency: row.frequency || null,
          route: row.route || null,
          purpose: row.purpose || null,
          instructions: row.instructions || null,
          status: row.status || 'last_recorded',
          facility_name: row.facility_name,
          doctor_name: row.doctor_name,
        });
      }

      const history: MedicationHistoryEntry[] = [];
      for (const [normalized, group] of groups.entries()) {
        const sorted = group.points.sort(
          (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        );

        // Count dose changes (different dosage values)
        const uniqueDoses = new Set(sorted.map((p) => `${p.dosage}|${p.frequency}`).filter(Boolean));
        const doseChanges = Math.max(0, uniqueDoses.size - 1);

        // Determine current status
        const lastPoint = sorted[sorted.length - 1];
        let currentStatus = 'last_recorded';
        if (lastPoint.status === 'discontinued' || lastPoint.status === 'stopped') {
          currentStatus = 'discontinued';
        } else if (lastPoint.status === 'active') {
          currentStatus = 'active';
        }
        // If a medication appears in a recent record, mark as last_recorded (not discontinued)

        history.push({
          medication_name: group.name,
          normalized_name: normalized,
          dose_timeline: sorted,
          first_recorded: sorted[0].event_date,
          last_recorded: lastPoint.event_date,
          current_status: currentStatus,
          dose_changes: doseChanges,
        });
      }

      // Sort by most recently recorded first
      return history.sort(
        (a, b) => new Date(b.last_recorded).getTime() - new Date(a.last_recorded).getTime()
      );
    } catch (err: any) {
      logger.error(`[MedicationHistoryService] Error for patient ${patientId}:`, err.message || err);
      return [];
    }
  }

  private static normalizeMedName(name: string): string {
    // Strip dosage info often embedded in drug name (e.g. "Metformin 500mg" → "metformin")
    return name
      .toLowerCase()
      .replace(/\d+(\.\d+)?\s*(mg|ml|mcg|iu|g|units?)/gi, '')
      .replace(/[^a-z]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
