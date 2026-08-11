import { query } from '../config/db';
import { logger } from '../utils/logger';

/**
 * MediVault V2 — Clinical Episode Service
 *
 * Groups related clinical_events into clinical_episodes.
 * 
 * Algorithm (deterministic, rule-based — no LLM for grouping):
 * 1. Load all clinical events for the patient ordered by event_date
 * 2. Group by shared primary condition (from structured_data.diagnoses)
 * 3. Within each condition group, merge events within 90-day windows
 * 4. Medication continuity: events sharing the same medication are grouped
 * 5. Assign episode status conservatively (never assumes resolution from silence)
 */

interface RawClinicalEvent {
  id: string;
  event_type: string;
  event_date: string;
  title: string;
  summary: string | null;
  doctor_name: string | null;
  facility_name: string | null;
  structured_data: any;
}

interface EpisodeGroup {
  primary_condition: string;
  title: string;
  description: string | null;
  events: RawClinicalEvent[];
  start_date: string;
  end_date: string;
  status: string;
}

const EPISODE_WINDOW_DAYS = 90; // Events within 90 days with shared condition = same episode

export class ClinicalEpisodeService {
  /**
   * Re-groups all clinical events for a patient into episodes.
   * Idempotent: deletes and rebuilds episode associations for this patient.
   * Safe to call repeatedly — only episode tables are modified, not clinical_events.
   */
  public static async groupEventsIntoEpisodes(patientId: string): Promise<number> {
    try {
      // 1. Load all non-consultation events for this patient
      const eventsRes = await query(
        `SELECT id, event_type, event_date::text, title, summary, doctor_name,
                facility_name, structured_data
         FROM public.clinical_events
         WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
         ORDER BY event_date ASC`,
        [patientId]
      );

      if (eventsRes.rows.length === 0) {
        return 0;
      }

      const events: RawClinicalEvent[] = eventsRes.rows;
      const episodeGroups = this.buildEpisodeGroups(events);

      if (episodeGroups.length === 0) {
        return 0;
      }

      // 2. Clear existing episodes for patient (rebuild from scratch)
      await query(
        `DELETE FROM public.clinical_episode_events 
         WHERE episode_id IN (SELECT id FROM public.clinical_episodes WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1)))`,
        [patientId]
      );
      await query(
        `DELETE FROM public.clinical_episodes WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))`,
        [patientId]
      );

      // 3. Insert new episodes + junction rows
      let episodesCreated = 0;
      for (const group of episodeGroups) {
        if (group.events.length < 1) continue;

        const episodeRes = await query(
          `INSERT INTO public.clinical_episodes (
            patient_id, title, description, primary_condition,
            status, start_date, end_date, event_count, document_count
          ) VALUES ($1, $2, $3, $4, $5::clinical_episode_status, $6, $7, $8, $9)
          RETURNING id;`,
          [
            patientId,
            group.title,
            group.description,
            group.primary_condition,
            group.status,
            group.start_date,
            group.end_date,
            group.events.length,
            new Set(group.events.map((e) => e.id)).size,
          ]
        );

        if (episodeRes.rows.length === 0) continue;
        const episodeId = episodeRes.rows[0].id;
        episodesCreated++;

        // Insert junction rows
        for (const event of group.events) {
          await query(
            `INSERT INTO public.clinical_episode_events (episode_id, event_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [episodeId, event.id]
          );
        }
      }

      logger.info(`[CLINICAL_EPISODE_UPDATED] patientId=${patientId} episodes=${episodesCreated}`);
      return episodesCreated;
    } catch (err: any) {
      logger.error(`[ClinicalEpisodeService] Error grouping episodes for patient ${patientId}:`, err.message || err);
      return 0;
    }
  }

  /**
   * Deterministic episode grouping logic.
   * Groups by shared condition, then by temporal proximity within EPISODE_WINDOW_DAYS.
   */
  private static buildEpisodeGroups(events: RawClinicalEvent[]): EpisodeGroup[] {
    const groups: Map<string, RawClinicalEvent[]> = new Map();

    for (const event of events) {
      const conditions = this.extractConditions(event);
      const medications = this.extractMedications(event);
      const isConsultation = event.event_type === 'CONSULTATION';

      if (conditions.length === 0 && medications.length === 0) {
        // Uncategorized events grouped under "General Care"
        const key = 'GENERAL_CARE';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(event);
        continue;
      }

      // Primary grouping: by condition
      for (const condition of conditions) {
        const normalizedCondition = this.normalizeConditionKey(condition);
        let matched = false;

        // Check if event fits into an existing group (temporal proximity)
        for (const [key, groupEvents] of groups.entries()) {
          if (!key.startsWith(normalizedCondition)) continue;
          const lastEvent = groupEvents[groupEvents.length - 1];
          const daysDiff = this.daysBetween(lastEvent.event_date, event.event_date);
          if (daysDiff <= EPISODE_WINDOW_DAYS) {
            groupEvents.push(event);
            matched = true;
            break;
          }
        }

        if (!matched) {
          // New episode for this condition
          const key = `${normalizedCondition}_${event.event_date}`;
          groups.set(key, [event]);
        }
      }

      // Secondary grouping: by medication (if not already in a condition group)
      if (conditions.length === 0 && medications.length > 0) {
        const medKey = `MED_${this.normalizeConditionKey(medications[0])}`;
        if (!groups.has(medKey)) groups.set(medKey, []);
        groups.get(medKey)!.push(event);
      }

      // Also include consultation events in the closest matching group
      if (isConsultation && conditions.length === 0) {
        const bestGroup = this.findClosestGroup(groups, event.event_date);
        if (bestGroup) {
          bestGroup.push(event);
        }
      }
    }

    // Convert map to episode objects
    const episodes: EpisodeGroup[] = [];
    for (const [key, groupEvents] of groups.entries()) {
      if (groupEvents.length === 0) continue;

      const sortedEvents = groupEvents.sort(
        (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );
      const firstEvent = sortedEvents[0];
      const lastEvent = sortedEvents[sortedEvents.length - 1];

      const primaryCondition = this.getPrimaryCondition(key, sortedEvents);
      const title = this.buildEpisodeTitle(primaryCondition, sortedEvents);
      const status = this.deriveEpisodeStatus(sortedEvents);

      episodes.push({
        primary_condition: primaryCondition,
        title,
        description: this.buildEpisodeDescription(sortedEvents),
        events: sortedEvents,
        start_date: firstEvent.event_date,
        end_date: lastEvent.event_date,
        status,
      });
    }

    return episodes;
  }

  private static extractConditions(event: RawClinicalEvent): string[] {
    const conditions: string[] = [];
    const sd = event.structured_data;
    if (!sd) return conditions;
    const diagnoses = Array.isArray(sd.diagnoses) ? sd.diagnoses : [];
    return diagnoses.filter((d: any) => typeof d === 'string' && d.trim().length > 0);
  }

  private static extractMedications(event: RawClinicalEvent): string[] {
    const sd = event.structured_data;
    if (!sd) return [];
    const meds = Array.isArray(sd.medications) ? sd.medications : [];
    return meds
      .map((m: any) => (typeof m === 'object' ? m.name : m))
      .filter((n: any) => typeof n === 'string' && n.trim().length > 0);
  }

  private static normalizeConditionKey(condition: string): string {
    return condition
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 60);
  }

  private static daysBetween(dateA: string, dateB: string): number {
    const msPerDay = 86400000;
    return Math.abs(
      new Date(dateB).getTime() - new Date(dateA).getTime()
    ) / msPerDay;
  }

  private static findClosestGroup(
    groups: Map<string, RawClinicalEvent[]>,
    eventDate: string
  ): RawClinicalEvent[] | null {
    let closestGroup: RawClinicalEvent[] | null = null;
    let closestDays = EPISODE_WINDOW_DAYS;

    for (const groupEvents of groups.values()) {
      if (groupEvents.length === 0) continue;
      const lastEvent = groupEvents[groupEvents.length - 1];
      const days = this.daysBetween(lastEvent.event_date, eventDate);
      if (days < closestDays) {
        closestDays = days;
        closestGroup = groupEvents;
      }
    }

    return closestGroup;
  }

  private static getPrimaryCondition(key: string, events: RawClinicalEvent[]): string {
    for (const event of events) {
      const conditions = this.extractConditions(event);
      if (conditions.length > 0) return conditions[0];
    }
    if (key === 'GENERAL_CARE') return 'General Care';
    if (key.startsWith('MED_')) {
      const meds = this.extractMedications(events[0]);
      return meds[0] || 'Medication Management';
    }
    return 'Medical Care';
  }

  private static buildEpisodeTitle(condition: string, events: RawClinicalEvent[]): string {
    const hasHospitalization = events.some((e) => e.event_type === 'HOSPITALIZATION');
    if (hasHospitalization) return `${condition} — Hospitalization`;
    return condition;
  }

  private static buildEpisodeDescription(events: RawClinicalEvent[]): string {
    const types = [...new Set(events.map((e) => e.event_type))];
    const typeLabels: Record<string, string> = {
      CONSULTATION: 'consultation',
      DIAGNOSIS: 'diagnosis',
      LAB_TEST: 'lab test',
      IMAGING: 'imaging',
      PRESCRIPTION: 'prescription',
      MEDICATION_CHANGE: 'medication change',
      PROCEDURE: 'procedure',
      HOSPITALIZATION: 'hospitalization',
      DISCHARGE: 'discharge',
      VACCINATION: 'vaccination',
      FOLLOW_UP: 'follow-up',
      SYMPTOM: 'symptom',
    };
    const labels = types.map((t) => typeLabels[t] || t.toLowerCase()).filter(Boolean);
    return `Episode includes: ${labels.join(', ')}.`;
  }

  /**
   * Episode status — conservative rules only. Absence of data ≠ resolution.
   */
  private static deriveEpisodeStatus(events: RawClinicalEvent[]): string {
    const hasDischarge = events.some((e) => e.event_type === 'DISCHARGE');
    const hasExplicitResolution = events.some((e) => {
      const sd = e.structured_data;
      return sd && (String(sd.status || '').toLowerCase() === 'resolved');
    });
    const lastEventDate = new Date(events[events.length - 1].event_date);
    const daysSinceLast = (Date.now() - lastEventDate.getTime()) / 86400000;

    if (hasExplicitResolution || hasDischarge) return 'RESOLVED';
    if (daysSinceLast <= 30) return 'ACTIVE';
    if (daysSinceLast <= 90) return 'ONGOING';
    return 'UNKNOWN'; // Absence of data is not evidence of resolution
  }
}
