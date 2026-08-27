import { query } from '../config/db';
import { logger } from '../utils/logger';

/**
 * MediVault V2 — Condition Journey Service
 *
 * Builds per-condition longitudinal event threads from clinical_events.
 * Each condition thread shows how a diagnosis has evolved over time.
 */

export interface ConditionEvent {
  event_id: string;
  document_id: string | null;
  event_type: string;
  event_date: string;
  title: string;
  summary: string | null;
  doctor_name: string | null;
  facility_name: string | null;
  is_milestone: boolean;
}

export interface ConditionJourney {
  condition_name: string;
  normalized_name: string;
  first_seen: string;
  last_seen: string;
  status: string;
  events: ConditionEvent[];
  related_lab_tests: string[];
  related_medications: string[];
}

export class ConditionJourneyService {
  public static async getPatientConditionJourneys(patientId: string): Promise<ConditionJourney[]> {
    try {
      // Get all diagnosis events + follow-ups + labs + prescriptions
      const res = await query(
        `SELECT
           ce.id as event_id,
           ce.document_id,
           ce.event_type,
           ce.event_date::text,
           ce.title,
           ce.summary,
           ce.doctor_name,
           ce.facility_name,
           ce.structured_data,
           ce.is_milestone
         FROM public.clinical_events ce
         WHERE (ce.patient_id = $1 OR ce.patient_id IN (SELECT id FROM public.patients WHERE user_id = $1) OR ce.patient_id IN (SELECT user_id FROM public.patients WHERE id = $1))
         ORDER BY ce.event_date ASC`,
        [patientId]
      );

      if (res.rows.length === 0) return [];

      // 1. Build document -> diagnoses index so encounters and prescriptions link to conditions
      const docDiagnosesMap = new Map<string, string[]>();
      for (const row of res.rows) {
        const sd = row.structured_data;
        const diagnoses: string[] = Array.isArray(sd?.diagnoses) ? sd.diagnoses : [];
        if (row.document_id && diagnoses.length > 0) {
          const existing = docDiagnosesMap.get(row.document_id) || [];
          docDiagnosesMap.set(row.document_id, Array.from(new Set([...existing, ...diagnoses])));
        }
      }

      // 2. Map conditions to events
      const conditionMap = new Map<string, { name: string; events: ConditionEvent[]; rawEventIds: Set<string> }>();

      for (const row of res.rows) {
        const sd = row.structured_data;
        let diagnoses: string[] = Array.isArray(sd?.diagnoses) ? sd.diagnoses : [];
        
        // If event has no direct diagnoses but shares document_id with a diagnosed condition, inherit
        if (diagnoses.length === 0 && row.document_id && docDiagnosesMap.has(row.document_id)) {
          diagnoses = docDiagnosesMap.get(row.document_id)!;
        }

        const eventPayload: ConditionEvent = {
          event_id: row.event_id,
          document_id: row.document_id,
          event_type: row.event_type,
          event_date: row.event_date,
          title: row.title,
          summary: row.summary,
          doctor_name: row.doctor_name,
          facility_name: row.facility_name,
          is_milestone: row.is_milestone,
        };

        // Attribute this event to every condition it mentions
        for (const diagnosis of diagnoses) {
          if (!diagnosis || !diagnosis.trim()) continue;
          const normalized = this.normalizeConditionName(diagnosis);
          if (!conditionMap.has(normalized)) {
            conditionMap.set(normalized, { name: diagnosis.trim(), events: [], rawEventIds: new Set() });
          }
          const existing = conditionMap.get(normalized)!;
          if (!existing.rawEventIds.has(row.event_id)) {
            existing.rawEventIds.add(row.event_id);
            existing.events.push(eventPayload);
          }
        }
      }

      // 3. Build journey objects
      const journeys: ConditionJourney[] = [];
      for (const [normalized, group] of conditionMap.entries()) {
        if (group.events.length === 0) continue;

        const sorted = group.events.sort(
          (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        );

        // Collect related lab tests and medications from all events linked to this condition
        const relatedLabs = new Set<string>();
        const relatedMeds = new Set<string>();
        for (const event of sorted) {
          const rowData = res.rows.find((r: any) => r.event_id === event.event_id);
          const sd = rowData?.structured_data || {};
          if (Array.isArray(sd.lab_results)) {
            for (const lab of sd.lab_results) {
              if (lab && lab.test_name) relatedLabs.add(lab.test_name);
            }
          }
          if (Array.isArray(sd.medications)) {
            for (const med of sd.medications) {
              const name = typeof med === 'string' ? med : med?.name;
              if (name) relatedMeds.add(name);
            }
          }
        }

        const lastEvent = sorted[sorted.length - 1];
        const daysSinceLast = (Date.now() - new Date(lastEvent.event_date).getTime()) / 86400000;
        const status = daysSinceLast <= 60 ? 'ACTIVE' : daysSinceLast <= 180 ? 'ONGOING' : 'UNKNOWN';

        journeys.push({
          condition_name: group.name,
          normalized_name: normalized,
          first_seen: sorted[0].event_date,
          last_seen: lastEvent.event_date,
          status,
          events: sorted,
          related_lab_tests: [...relatedLabs],
          related_medications: [...relatedMeds],
        });
      }

      // Sort by most recent activity
      return journeys.sort(
        (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
      );
    } catch (err: any) {
      logger.error(`[ConditionJourneyService] Error for patient ${patientId}:`, err.message || err);
      return [];
    }
  }

  private static normalizeConditionName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .trim()
      .substring(0, 80);
  }
}
