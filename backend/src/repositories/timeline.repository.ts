import { query } from '../config/db';
import { logger } from '../utils/logger';

/**
 * MediVault V2 — Timeline Repository
 *
 * Optimized data-access layer for the clinical timeline.
 * All queries use JOINs and CTEs — zero N+1 queries.
 */

export interface TimelineFilters {
  event_type?: string;
  date_from?: string;
  date_to?: string;
  is_milestone?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class TimelineRepository {
  /**
   * Health snapshot: counts and summary stats for the patient.
   */
  public static async getPatientTimelineSummary(patientId: string): Promise<{
    total_documents: number;
    total_clinical_events: number;
    total_episodes: number;
    active_conditions: number;
    active_medications: number;
    last_activity_date: string | null;
    milestone_events: number;
  }> {
    try {
      const res = await query(
        `SELECT
          (
            SELECT COUNT(*)::int
            FROM public.documents
            WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
              AND (is_archived IS FALSE OR is_archived IS NULL)
          ) as total_documents,

          (
            SELECT COUNT(*)::int
            FROM public.clinical_events
            WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
          ) as total_clinical_events,

          (
            SELECT COUNT(*)::int
            FROM public.clinical_events
            WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
              AND is_milestone = TRUE
          ) as milestone_events,

          (
            SELECT COUNT(*)::int
            FROM public.clinical_episodes
            WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
          ) as total_episodes,

          COALESCE((
            SELECT COUNT(DISTINCT diag)::int
            FROM public.clinical_events ce,
                 jsonb_array_elements_text(ce.structured_data->'diagnoses') as diag
            WHERE (ce.patient_id = $1 OR ce.patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
              AND ce.structured_data->'diagnoses' IS NOT NULL
              AND jsonb_typeof(ce.structured_data->'diagnoses') = 'array'
          ), 0) as active_conditions,

          COALESCE((
            SELECT COUNT(DISTINCT lower(med_item->>'name'))::int
            FROM public.clinical_events ce,
                 jsonb_array_elements(ce.structured_data->'medications') as med_item
            WHERE (ce.patient_id = $1 OR ce.patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
              AND ce.structured_data->'medications' IS NOT NULL
              AND jsonb_typeof(ce.structured_data->'medications') = 'array'
          ), 0) as active_medications,

          (
            SELECT MAX(event_date)::text
            FROM public.clinical_events
            WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
          ) as last_activity_date`,
        [patientId]
      );

      const row = res.rows[0] || {};
      return {
        total_documents: Number(row.total_documents || 0),
        total_clinical_events: Number(row.total_clinical_events || 0),
        total_episodes: Number(row.total_episodes || 0),
        active_conditions: Number(row.active_conditions || 0),
        active_medications: Number(row.active_medications || 0),
        last_activity_date: row.last_activity_date || null,
        milestone_events: Number(row.milestone_events || 0),
      };
    } catch (err: any) {
      logger.error(`[TimelineRepository] getPatientTimelineSummary error:`, err.message || err);
      return {
        total_documents: 0,
        total_clinical_events: 0,
        total_episodes: 0,
        active_conditions: 0,
        active_medications: 0,
        last_activity_date: null,
        milestone_events: 0,
      };
    }
  }

  /**
   * Paginated clinical events with document provenance.
   * All joins done in one query — no N+1.
   */
  public static async getPatientClinicalEvents(
    patientId: string,
    filters: TimelineFilters,
    pagination: PaginationOptions
  ): Promise<{ events: any[]; total: number; totalPages: number }> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const params: any[] = [patientId];
    const conditions: string[] = ['(ce.patient_id = $1 OR ce.patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))'];

    if (filters.event_type) {
      params.push(filters.event_type);
      conditions.push(`ce.event_type = $${params.length}::clinical_event_type`);
    }
    if (filters.date_from) {
      params.push(filters.date_from);
      conditions.push(`ce.event_date >= $${params.length}::date`);
    }
    if (filters.date_to) {
      params.push(filters.date_to);
      conditions.push(`ce.event_date <= $${params.length}::date`);
    }
    if (filters.is_milestone === true) {
      conditions.push(`ce.is_milestone = TRUE`);
    }

    const where = conditions.join(' AND ');

    try {
      const countRes = await query(
        `SELECT COUNT(*)::int as total
         FROM public.clinical_events ce
         LEFT JOIN public.ai_analyses a ON a.id = ce.analysis_id
         WHERE ${where} AND (ce.analysis_id IS NULL OR a.is_active = TRUE)`,
        params
      );
      const total = countRes.rows[0]?.total || 0;

      const dataRes = await query(
        `SELECT
           ce.id, ce.event_type, ce.event_date::text, ce.title, ce.summary,
           ce.severity, ce.status, ce.doctor_name, ce.facility_name,
           ce.department, ce.is_milestone, ce.structured_data,
           ce.document_id, ce.analysis_id, ce.created_at,
           d.document_name, d.document_category, d.checksum_sha256,
           d.file_extension, d.mime_type
         FROM public.clinical_events ce
         LEFT JOIN public.documents d ON d.id = ce.document_id
         LEFT JOIN public.ai_analyses a ON a.id = ce.analysis_id
         WHERE ${where} AND (ce.analysis_id IS NULL OR a.is_active = TRUE)
         ORDER BY ce.event_date DESC, ce.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      return {
        events: dataRes.rows,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      };
    } catch (err: any) {
      logger.error(`[TimelineRepository] getPatientClinicalEvents error:`, err.message);
      return { events: [], total: 0, totalPages: 1 };
    }
  }

  /**
   * Clinical episodes with event summary.
   */
  public static async getPatientEpisodes(patientId: string): Promise<any[]> {
    try {
      const res = await query(
        `SELECT
           ep.id, ep.title, ep.description, ep.primary_condition,
           ep.status, ep.start_date::text, ep.end_date::text,
           ep.event_count, ep.document_count,
           array_agg(DISTINCT ee.event_id) FILTER (WHERE ee.event_id IS NOT NULL) as event_ids
         FROM public.clinical_episodes ep
         LEFT JOIN public.clinical_episode_events ee ON ee.episode_id = ep.id
         WHERE (ep.patient_id = $1 OR ep.patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
         GROUP BY ep.id
         ORDER BY ep.start_date DESC`,
        [patientId]
      );
      return res.rows;
    } catch (err: any) {
      logger.error(`[TimelineRepository] getPatientEpisodes error:`, err.message);
      return [];
    }
  }

  /**
   * Record gaps: periods > 90 days with no clinical events.
   */
  public static async getTimelineGaps(patientId: string): Promise<Array<{
    from_date: string;
    to_date: string;
    gap_days: number;
  }>> {
    try {
      const res = await query(
        `WITH ordered_events AS (
          SELECT event_date, LAG(event_date) OVER (ORDER BY event_date) as prev_date
          FROM public.clinical_events
          WHERE (patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
        )
        SELECT
          prev_date::text as from_date,
          event_date::text as to_date,
          (event_date - prev_date)::int as gap_days
        FROM ordered_events
        WHERE (event_date - prev_date) > 90
        ORDER BY gap_days DESC`,
        [patientId]
      );
      return res.rows;
    } catch (err: any) {
      logger.error(`[TimelineRepository] getTimelineGaps error:`, err.message);
      return [];
    }
  }

  /**
   * Notable recent changes: lab values that changed significantly.
   */
  public static async getNotableChanges(patientId: string): Promise<Array<{
    test_name: string;
    change_direction: string;
    percentage_change: number;
    current_value: string;
    previous_value: string;
  }>> {
    try {
      const res = await query(
        `SELECT DISTINCT
           lab_item->>'test_name' as test_name,
           lab_item->>'status' as status,
           lab_item->>'value' as value,
           ce.event_date::text
         FROM public.clinical_events ce,
              jsonb_array_elements(structured_data->'lab_results') as lab_item
         WHERE (ce.patient_id = $1 OR ce.patient_id IN (SELECT id FROM public.patients WHERE user_id = $1))
           AND ce.event_type = 'LAB_TEST'
           AND lab_item->>'status' IN ('HIGH', 'LOW', 'CRITICAL')
         ORDER BY ce.event_date DESC
         LIMIT 10`,
        [patientId]
      );
      return res.rows;
    } catch (err: any) {
      return [];
    }
  }
}
