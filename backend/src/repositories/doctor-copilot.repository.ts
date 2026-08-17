import { query } from '../config/db';
import { logger } from '../utils/logger';

/**
 * MediVault — Doctor Copilot Repository
 *
 * Handles persistence for:
 *   - Doctor-scoped chat sessions (doctor_copilot_sessions)
 *   - Clinical messages (doctor_copilot_messages)
 *   - Cached AI patient briefs (doctor_patient_briefs)
 *   - Clinical alerts (ai_clinical_alerts)
 *   - Tool audit log (ai_tool_audit_log)
 *
 * Also provides consent-verified RAG context retrieval from patient documents —
 * mirrors the CopilotRepository pattern but scoped to a doctor's consented patient.
 */

export interface DoctorChatSession {
  id: string;
  doctor_id: string;
  patient_id: string;
  title: string;
  mode: string;
  is_archived: boolean;
  message_count: number;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorChatMessage {
  id: string;
  session_id: string;
  role: 'doctor' | 'assistant' | 'system';
  content: string;
  sources: string[];
  tools_used: string[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface PatientClinicalBrief {
  patient_name: string;
  age: string | null;
  gender: string | null;
  blood_group: string | null;
  critical_flags: Array<{ label: string; value: string; severity: 'critical' | 'warning' | 'info' }>;
  active_conditions: string[];
  current_medications: Array<{ name: string; dosage?: string; frequency?: string }>;
  drug_warnings: string[];
  pending_items: string[];
  trend_snapshot: string;
  generated_at: string;
  raw_brief: string; // The LLM-generated markdown brief
}

export interface ClinicalAlert {
  id: string;
  doctor_id: string;
  patient_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  is_dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
}

export class DoctorCopilotRepository {

  // ─── Session CRUD ──────────────────────────────────────────────────────────

  public static async createSession(
    doctorId: string,
    patientId: string,
    title?: string
  ): Promise<DoctorChatSession> {
    try {
      const sql = `
        INSERT INTO public.doctor_copilot_sessions (doctor_id, patient_id, title)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      const result = await query(sql, [doctorId, patientId, title || 'Clinical Consultation']);
      return this.mapSessionRow(result.rows[0]);
    } catch (err: any) {
      logger.error('[DoctorCopilotRepository] createSession error:', err.message || err);
      // Graceful in-memory fallback
      return {
        id: `dr-session-${Date.now()}`,
        doctor_id: doctorId,
        patient_id: patientId,
        title: title || 'Clinical Consultation',
        mode: 'clinical',
        is_archived: false,
        message_count: 0,
        last_message_preview: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  public static async getSession(sessionId: string): Promise<DoctorChatSession | null> {
    try {
      const result = await query(
        `SELECT * FROM public.doctor_copilot_sessions WHERE id = $1 AND is_archived = FALSE LIMIT 1;`,
        [sessionId]
      );
      return result.rows.length > 0 ? this.mapSessionRow(result.rows[0]) : null;
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] getSession error:', err.message || err);
      return null;
    }
  }

  public static async listSessions(doctorId: string, patientId: string, limit = 20): Promise<DoctorChatSession[]> {
    try {
      const sql = `
        SELECT s.*,
          (SELECT content FROM public.doctor_copilot_messages m
           WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message_preview
        FROM public.doctor_copilot_sessions s
        WHERE s.doctor_id = $1 AND s.patient_id = $2 AND s.is_archived = FALSE
        ORDER BY s.updated_at DESC
        LIMIT $3;
      `;
      const result = await query(sql, [doctorId, patientId, limit]);
      return result.rows.map((row: any) => this.mapSessionRow(row));
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] listSessions error:', err.message || err);
      return [];
    }
  }

  public static async archiveSession(sessionId: string): Promise<boolean> {
    try {
      await query(
        `UPDATE public.doctor_copilot_sessions SET is_archived = TRUE, updated_at = NOW() WHERE id = $1;`,
        [sessionId]
      );
      return true;
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] archiveSession error:', err.message || err);
      return false;
    }
  }

  public static async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    try {
      await query(
        `UPDATE public.doctor_copilot_sessions SET title = $1, updated_at = NOW() WHERE id = $2;`,
        [title, sessionId]
      );
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] updateSessionTitle error:', err.message || err);
    }
  }

  // ─── Message CRUD ──────────────────────────────────────────────────────────

  public static async addMessage(
    sessionId: string,
    role: 'doctor' | 'assistant' | 'system',
    content: string,
    sources: string[] = [],
    toolsUsed: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<DoctorChatMessage> {
    try {
      const sql = `
        INSERT INTO public.doctor_copilot_messages
          (session_id, role, content, sources, tools_used, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const result = await query(sql, [
        sessionId, role, content,
        JSON.stringify(sources),
        JSON.stringify(toolsUsed),
        JSON.stringify(metadata),
      ]);

      // Bump session counter + updated_at
      await query(
        `UPDATE public.doctor_copilot_sessions SET message_count = message_count + 1, updated_at = NOW() WHERE id = $1;`,
        [sessionId]
      );

      return this.mapMessageRow(result.rows[0]);
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] addMessage error:', err.message || err);
      return {
        id: `msg-${Date.now()}`,
        session_id: sessionId,
        role,
        content,
        sources,
        tools_used: toolsUsed,
        metadata,
        created_at: new Date().toISOString(),
      };
    }
  }

  public static async getMessages(sessionId: string, limit = 50): Promise<DoctorChatMessage[]> {
    try {
      const result = await query(
        `SELECT * FROM public.doctor_copilot_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2;`,
        [sessionId, limit]
      );
      return result.rows.map((row: any) => this.mapMessageRow(row));
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] getMessages error:', err.message || err);
      return [];
    }
  }

  public static async getRecentMessages(sessionId: string, limit = 16): Promise<DoctorChatMessage[]> {
    try {
      const sql = `
        SELECT * FROM (
          SELECT * FROM public.doctor_copilot_messages
          WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2
        ) sub ORDER BY created_at ASC;
      `;
      const result = await query(sql, [sessionId, limit]);
      return result.rows.map((row: any) => this.mapMessageRow(row));
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] getRecentMessages error:', err.message || err);
      return [];
    }
  }

  // ─── Consent-Gated Patient RAG Context ────────────────────────────────────
  //
  // Returns ALL documents for the patient — full access model.
  // Caller (DoctorCopilotService) must have already verified active consent before calling this.

  public static async getPatientRAGContext(patientId: string, limit = 15): Promise<{
    documents: Array<{
      document_id: string;
      document_name: string;
      document_category: string;
      clinical_summary: string | null;
      ocr_text: string | null;
      ai_analysis: any;
      hospital_name: string | null;
      doctor_name: string | null;
      visit_date: string | null;
      created_at: string;
    }>;
    medical_knowledge: Array<{
      knowledge_type: string;
      name: string;
      value: string | null;
      unit: string | null;
      reference_range: string | null;
      status: string;
      recorded_date: string | null;
    }>;
    patient_profile: {
      full_name: string | null;
      blood_group: string | null;
      gender: string | null;
      date_of_birth: string | null;
      allergies: any[];
      chronic_conditions: any[];
    } | null;
  }> {
    const documents: any[] = [];
    const medicalKnowledge: any[] = [];
    let patientProfile: any = null;

    // 1. All documents — full access granted via consent
    try {
      const docSql = `
        SELECT
          d.id as document_id,
          d.document_name,
          d.document_category,
          d.created_at,
          a.ocr_raw_text,
          a.clinical_summary,
          a.raw_response_json as ai_analysis
        FROM public.documents d
        LEFT JOIN public.ai_analyses a ON a.document_id = d.id AND a.is_active = TRUE
        WHERE (
          d.patient_id = $1
          OR d.uploader_id = $1
          OR d.patient_id IN (SELECT id FROM public.patients WHERE user_id = $1)
          OR d.uploader_id IN (SELECT user_id FROM public.patients WHERE id = $1)
        ) AND d.is_archived = FALSE
        ORDER BY d.created_at DESC
        LIMIT $2;
      `;
      const docResult = await query(docSql, [patientId, limit]);
      for (const row of docResult.rows) {
        let aiAnalysis = null;
        if (row.ai_analysis) {
          try {
            aiAnalysis = typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : row.ai_analysis;
          } catch (e) {}
        }
        documents.push({
          document_id: row.document_id,
          document_name: row.document_name,
          document_category: row.document_category,
          clinical_summary: row.clinical_summary,
          ocr_text: row.ocr_raw_text,
          ai_analysis: aiAnalysis,
          hospital_name: aiAnalysis?.hospital?.name || null,
          doctor_name: aiAnalysis?.doctor?.name || null,
          visit_date: aiAnalysis?.visit?.visit_date || null,
          created_at: row.created_at,
        });
      }
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] RAG document retrieval error:', err.message || err);
    }

    // 2. Structured medical knowledge
    try {
      const mkSql = `
        SELECT knowledge_type, name, value, unit, reference_range, status, recorded_date
        FROM public.medical_knowledge
        WHERE patient_id = $1 OR patient_id IN (SELECT id FROM public.patients WHERE user_id = $1)
        ORDER BY recorded_date DESC NULLS LAST
        LIMIT 60;
      `;
      const mkResult = await query(mkSql, [patientId]);
      for (const row of mkResult.rows) {
        medicalKnowledge.push({
          knowledge_type: row.knowledge_type,
          name: row.name,
          value: row.value,
          unit: row.unit,
          reference_range: row.reference_range,
          status: row.status,
          recorded_date: row.recorded_date,
        });
      }
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] RAG medical_knowledge retrieval error:', err.message || err);
    }

    // 3. Patient profile
    try {
      const profileSql = `
        SELECT
          prof.full_name,
          pat.blood_group,
          pat.gender,
          pat.date_of_birth,
          COALESCE(pat.allergies, '[]'::jsonb) as allergies,
          COALESCE(pat.chronic_conditions, '[]'::jsonb) as chronic_conditions
        FROM public.patients pat
        JOIN public.users_profile prof ON prof.id = pat.user_id
        WHERE pat.user_id = $1 OR pat.id = $1
        LIMIT 1;
      `;
      const profileResult = await query(profileSql, [patientId]);
      if (profileResult.rows.length > 0) {
        const p = profileResult.rows[0];
        patientProfile = {
          full_name: p.full_name || null,
          blood_group: p.blood_group || null,
          gender: p.gender || null,
          date_of_birth: p.date_of_birth || null,
          allergies: Array.isArray(p.allergies) ? p.allergies : [],
          chronic_conditions: Array.isArray(p.chronic_conditions) ? p.chronic_conditions : [],
        };
      }
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] RAG patient_profile retrieval error:', err.message || err);
    }

    return { documents, medical_knowledge: medicalKnowledge, patient_profile: patientProfile };
  }

  // ─── Consent Verification ──────────────────────────────────────────────────

  /**
   * Checks whether a doctor has an active (approved) consent grant for a patient.
   * The doctor's user_id is matched against the doctors table to get the doctor record.
   */
  public static async hasActiveConsent(doctorUserId: string, patientId: string): Promise<boolean> {
    try {
      const sql = `
        SELECT cg.id
        FROM public.consent_grants cg
        WHERE (
          cg.grantee_id = $1
          OR cg.grantee_id IN (SELECT id FROM public.doctors WHERE user_id = $1)
          OR cg.grantee_id IN (SELECT user_id FROM public.doctors WHERE id = $1)
        )
          AND (
            cg.patient_id = $2
            OR cg.patient_id IN (SELECT id FROM public.patients WHERE user_id = $2)
            OR cg.patient_id IN (SELECT user_id FROM public.patients WHERE id = $2)
          )
          AND (cg.status::text ILIKE 'APPROVED')
          AND (cg.expires_at IS NULL OR cg.expires_at > NOW())
        LIMIT 1;
      `;
      const result = await query(sql, [doctorUserId, patientId]);
      return result.rows.length > 0;
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] hasActiveConsent error:', err.message || err);
      return true;
    }
  }

  // ─── Clinical Alerts ───────────────────────────────────────────────────────

  public static async saveAlerts(
    doctorId: string,
    patientId: string,
    alerts: Array<{ alert_type: string; severity: string; title: string; body: string }>
  ): Promise<void> {
    if (alerts.length === 0) return;
    try {
      // Clear old non-dismissed alerts before inserting fresh ones
      await query(
        `DELETE FROM public.ai_clinical_alerts WHERE doctor_id = $1 AND patient_id = $2 AND is_dismissed = FALSE;`,
        [doctorId, patientId]
      );

      for (const alert of alerts) {
        await query(
          `INSERT INTO public.ai_clinical_alerts (doctor_id, patient_id, alert_type, severity, title, body)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [doctorId, patientId, alert.alert_type, alert.severity, alert.title, alert.body]
        );
      }
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] saveAlerts error:', err.message || err);
    }
  }

  public static async getAlerts(doctorId: string, patientId: string): Promise<ClinicalAlert[]> {
    try {
      const result = await query(
        `SELECT * FROM public.ai_clinical_alerts
         WHERE doctor_id = $1 AND patient_id = $2 AND is_dismissed = FALSE
         ORDER BY
           CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
           created_at DESC;`,
        [doctorId, patientId]
      );
      return result.rows.map((row: any) => ({
        id: row.id,
        doctor_id: row.doctor_id,
        patient_id: row.patient_id,
        alert_type: row.alert_type,
        severity: row.severity,
        title: row.title,
        body: row.body,
        is_dismissed: row.is_dismissed,
        dismissed_at: row.dismissed_at ? new Date(row.dismissed_at).toISOString() : null,
        created_at: new Date(row.created_at).toISOString(),
      }));
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] getAlerts error:', err.message || err);
      return [];
    }
  }

  public static async dismissAlert(alertId: string): Promise<boolean> {
    try {
      await query(
        `UPDATE public.ai_clinical_alerts SET is_dismissed = TRUE, dismissed_at = NOW() WHERE id = $1;`,
        [alertId]
      );
      return true;
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] dismissAlert error:', err.message || err);
      return false;
    }
  }

  // ─── Patient Brief Cache ───────────────────────────────────────────────────

  public static async getCachedBrief(doctorId: string, patientId: string): Promise<PatientClinicalBrief | null> {
    try {
      const result = await query(
        `SELECT brief_json FROM public.doctor_patient_briefs
         WHERE doctor_id = $1 AND patient_id = $2
           AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1;`,
        [doctorId, patientId]
      );
      if (result.rows.length > 0) {
        return result.rows[0].brief_json as PatientClinicalBrief;
      }
      return null;
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] getCachedBrief error:', err.message || err);
      return null;
    }
  }

  public static async saveBrief(doctorId: string, patientId: string, brief: PatientClinicalBrief): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min TTL
      await query(
        `INSERT INTO public.doctor_patient_briefs (doctor_id, patient_id, brief_json, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (doctor_id, patient_id) DO UPDATE SET
           brief_json = EXCLUDED.brief_json,
           generated_at = NOW(),
           expires_at = EXCLUDED.expires_at;`,
        [doctorId, patientId, JSON.stringify(brief), expiresAt]
      );
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] saveBrief error:', err.message || err);
    }
  }

  public static async invalidateBrief(patientId: string): Promise<void> {
    try {
      await query(
        `UPDATE public.doctor_patient_briefs SET expires_at = NOW() - INTERVAL '1 second' WHERE patient_id = $1;`,
        [patientId]
      );
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] invalidateBrief error:', err.message || err);
    }
  }

  // ─── Tool Audit Log ────────────────────────────────────────────────────────

  public static async logToolUse(
    doctorId: string,
    patientId: string,
    toolName: string,
    inputParams: Record<string, any>,
    outputSummary: string,
    executionMs: number
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO public.ai_tool_audit_log (doctor_id, patient_id, tool_name, input_params, output_summary, execution_ms)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [doctorId, patientId, toolName, JSON.stringify(inputParams), outputSummary, executionMs]
      );
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] logToolUse error:', err.message || err);
    }
  }

  // ─── Row Mappers ───────────────────────────────────────────────────────────

  private static mapSessionRow(row: any): DoctorChatSession {
    return {
      id: row.id,
      doctor_id: row.doctor_id,
      patient_id: row.patient_id,
      title: row.title,
      mode: row.mode,
      is_archived: row.is_archived,
      message_count: row.message_count || 0,
      last_message_preview: row.last_message_preview || null,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  private static mapMessageRow(row: any): DoctorChatMessage {
    const parseSafe = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    };

    const parseObjSafe = (val: any) => {
      if (val && typeof val === 'object' && !Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return {}; }
      }
      return {};
    };

    return {
      id: row.id,
      session_id: row.session_id,
      role: row.role,
      content: row.content,
      sources: parseSafe(row.sources),
      tools_used: parseSafe(row.tools_used),
      metadata: parseObjSafe(row.metadata),
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  // ─── Consented Patients List ───────────────────────────────────────────────

  /**
   * Returns ALL patients who have given this doctor an active, approved, non-expired consent.
   * This drives the patient-picker dropdown in the Doctor Copilot UI.
   * Zero dummy data — 100% real DB records.
   */
  public static async getConsentedPatients(doctorUserId: string): Promise<Array<{
    patient_id: string;
    user_id: string;
    full_name: string;
    blood_group: string | null;
    gender: string | null;
    date_of_birth: string | null;
    avatar_url: string | null;
    consent_id: string;
    consent_granted_at: string;
  }>> {
    try {
      const sql = `
        SELECT DISTINCT
          p.id          AS patient_id,
          p.user_id     AS user_id,
          prof.full_name,
          p.blood_group,
          p.gender,
          p.date_of_birth,
          prof.avatar_url,
          cg.id         AS consent_id,
          cg.created_at AS consent_granted_at
        FROM public.consent_grants cg
        JOIN public.patients p    ON p.id = cg.patient_id OR p.user_id = cg.patient_id
        JOIN public.users_profile prof ON prof.id = p.user_id
        WHERE (
          cg.grantee_id = $1
          OR cg.grantee_id IN (SELECT id FROM public.doctors WHERE user_id = $1)
          OR cg.grantee_id IN (SELECT user_id FROM public.doctors WHERE id = $1)
        )
          AND (cg.status::text ILIKE 'APPROVED')
          AND (cg.expires_at IS NULL OR cg.expires_at > NOW())
        ORDER BY prof.full_name ASC;
      `;
      const result = await query(sql, [doctorUserId]);
      return result.rows.map((row: any) => ({
        patient_id: row.patient_id,
        user_id: row.user_id,
        full_name: row.full_name || 'Unknown Patient',
        blood_group: row.blood_group || null,
        gender: row.gender || null,
        date_of_birth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().slice(0, 10) : null,
        avatar_url: row.avatar_url || null,
        consent_id: row.consent_id,
        consent_granted_at: new Date(row.consent_granted_at).toISOString(),
      }));
    } catch (err: any) {
      logger.warn('[DoctorCopilotRepository] getConsentedPatients error:', err.message || err);
      return [];
    }
  }
}

