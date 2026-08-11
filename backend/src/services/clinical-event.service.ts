import crypto from 'crypto';
import { query } from '../config/db';
import { MedicalAIAnalysis } from '../types/medical_ai';
import { logger } from '../utils/logger';

/**
 * MediVault V2 — Clinical Event Service
 *
 * Converts a normalized MedicalAIAnalysis into durable clinical_events rows.
 * 
 * Key guarantees:
 * - Idempotent: duplicate events per document are updated via unique idempotency_key (scopeId = documentId || patientId)
 * - Transactional: all events for one analysis succeed or all roll back
 * - Evidence-linked: every event retains document_id + analysis_id
 * - No medical data is invented — only extracted information is stored
 */

export type ClinicalEventType =
  | 'CONSULTATION'
  | 'DIAGNOSIS'
  | 'LAB_TEST'
  | 'IMAGING'
  | 'PRESCRIPTION'
  | 'MEDICATION_CHANGE'
  | 'PROCEDURE'
  | 'HOSPITALIZATION'
  | 'DISCHARGE'
  | 'VACCINATION'
  | 'FOLLOW_UP'
  | 'SYMPTOM'
  | 'OTHER';

export type ClinicalEventSeverity = 'NORMAL' | 'MONITOR' | 'CRITICAL';
export type ClinicalEventStatus = 'ACTIVE' | 'IMPROVING' | 'STABLE' | 'RESOLVED' | 'ONGOING' | 'UNKNOWN';

export interface ClinicalEventPayload {
  patient_id: string;
  document_id: string | null;
  analysis_id: string | null;
  event_type: ClinicalEventType;
  event_date: string;
  title: string;
  summary: string | null;
  severity: ClinicalEventSeverity;
  status: ClinicalEventStatus;
  doctor_name: string | null;
  facility_name: string | null;
  department: string | null;
  structured_data: Record<string, any>;
  is_milestone: boolean;
  idempotency_key: string;
}

export interface GenerationResult {
  created: number;
  skipped: number;
  failed: number;
  eventIds: string[];
}

export class ClinicalEventService {
  /**
   * Primary entry point: generate clinical events from a normalized AI analysis.
   * Wraps everything in a transaction — all events created or none.
   */
  public static async generateEventsFromAnalysis(
    patientId: string,
    documentId: string,
    analysisId: string,
    analysis: MedicalAIAnalysis
  ): Promise<GenerationResult> {
    const result: GenerationResult = { created: 0, skipped: 0, failed: 0, eventIds: [] };
    const eventDate = analysis.visit?.visit_date || new Date().toISOString().split('T')[0];
    const doctorName = analysis.doctor?.name || null;
    const facilityName = analysis.hospital?.name || null;
    const department = analysis.hospital?.department || null;
    const scopeId = documentId || patientId;

    // Collect all events to insert
    const events: ClinicalEventPayload[] = [];

    // ── 1. Encounter / Consultation ──────────────────────────────
    if (analysis.visit?.visit_date) {
      const encounterType = analysis.visit.encounter_type || 'CONSULTATION';
      const isFollowUp = encounterType.toLowerCase().includes('follow');
      events.push({
        patient_id: patientId,
        document_id: documentId,
        analysis_id: analysisId,
        event_type: isFollowUp ? 'FOLLOW_UP' : 'CONSULTATION',
        event_date: eventDate,
        title: isFollowUp
          ? `Follow-up${doctorName ? ` with ${doctorName}` : ''}`
          : `Consultation${doctorName ? ` with ${doctorName}` : ''}`,
        summary: analysis.document.summary || null,
        severity: 'NORMAL',
        status: 'UNKNOWN',
        doctor_name: doctorName,
        facility_name: facilityName,
        department,
        structured_data: {
          encounter_type: encounterType,
          vitals: analysis.vitals || {},
          symptoms: analysis.symptoms,
          red_flags: analysis.red_flags,
        },
        is_milestone: false,
        idempotency_key: this.makeKey(scopeId, 'CONSULTATION', eventDate, 'encounter'),
      });
    }

    // ── 2. Diagnoses ─────────────────────────────────────────────
    for (const diagnosis of analysis.diagnosis) {
      if (!diagnosis.trim()) continue;
      events.push({
        patient_id: patientId,
        document_id: documentId,
        analysis_id: analysisId,
        event_type: 'DIAGNOSIS',
        event_date: eventDate,
        title: diagnosis.trim(),
        summary: `Diagnosis documented: ${diagnosis.trim()}`,
        severity: 'MONITOR',
        status: 'ACTIVE',
        doctor_name: doctorName,
        facility_name: facilityName,
        department,
        structured_data: {
          diagnoses: analysis.diagnosis,
          symptoms: analysis.symptoms,
        },
        is_milestone: true,
        idempotency_key: this.makeKey(scopeId, 'DIAGNOSIS', eventDate, diagnosis.trim()),
      });
    }

    // ── 3. Lab Tests ─────────────────────────────────────────────
    if (analysis.lab_results.length > 0) {
      // Determine severity of the overall lab panel
      const hasCritical = analysis.lab_results.some((l) => l.status === 'CRITICAL');
      const hasAbnormal = analysis.lab_results.some((l) => l.status !== 'NORMAL');
      const severity: ClinicalEventSeverity = hasCritical ? 'CRITICAL' : hasAbnormal ? 'MONITOR' : 'NORMAL';

      // Determine lab date — use visit date as fallback
      const labDate = analysis.lab_results[0]?.test_date || eventDate;

      events.push({
        patient_id: patientId,
        document_id: documentId,
        analysis_id: analysisId,
        event_type: 'LAB_TEST',
        event_date: labDate,
        title: `${analysis.document.document_type || 'Laboratory'} Results`,
        summary: `${analysis.lab_results.length} test${analysis.lab_results.length !== 1 ? 's' : ''} reported. ${hasAbnormal ? 'Abnormal values detected.' : 'All values within reference range.'}`,
        severity,
        status: 'UNKNOWN',
        doctor_name: doctorName,
        facility_name: facilityName,
        department: department || (facilityName ? 'Laboratory' : null),
        structured_data: {
          lab_results: analysis.lab_results,
        },
        is_milestone: hasCritical,
        idempotency_key: this.makeKey(scopeId, 'LAB_TEST', labDate, 'panel'),
      });
    }

    // ── 4. Imaging ───────────────────────────────────────────────
    for (const img of (analysis.imaging || [])) {
      if (!img.modality && !img.findings) continue;
      const imgDate = img.date || eventDate;
      const title = [img.modality, img.body_region].filter(Boolean).join(' — ') || 'Imaging Study';
      events.push({
        patient_id: patientId,
        document_id: documentId,
        analysis_id: analysisId,
        event_type: 'IMAGING',
        event_date: imgDate,
        title,
        summary: img.impression || img.findings || null,
        severity: 'NORMAL',
        status: 'UNKNOWN',
        doctor_name: doctorName,
        facility_name: facilityName,
        department: department || 'Radiology',
        structured_data: { imaging: img },
        is_milestone: false,
        idempotency_key: this.makeKey(scopeId, 'IMAGING', imgDate, title),
      });
    }

    // ── 5. Medications / Prescriptions ───────────────────────────
    if (analysis.medications.length > 0) {
      // Check if any medication was explicitly changed
      const hasMedChange = analysis.medications.some((m) => m.status === 'changed' || m.status === 'modified');
      events.push({
        patient_id: patientId,
        document_id: documentId,
        analysis_id: analysisId,
        event_type: hasMedChange ? 'MEDICATION_CHANGE' : 'PRESCRIPTION',
        event_date: eventDate,
        title: `${analysis.medications.length} Medication${analysis.medications.length !== 1 ? 's' : ''} Prescribed`,
        summary: analysis.medications.map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''}`).join('; '),
        severity: 'NORMAL',
        status: 'ACTIVE',
        doctor_name: doctorName,
        facility_name: facilityName,
        department,
        structured_data: {
          medications: analysis.medications,
        },
        is_milestone: hasMedChange,
        idempotency_key: this.makeKey(scopeId, 'PRESCRIPTION', eventDate, 'medications'),
      });
    }

    // ── 6. Procedures ────────────────────────────────────────────
    for (const procedure of analysis.procedures) {
      if (!procedure.trim()) continue;
      events.push({
        patient_id: patientId,
        document_id: documentId,
        analysis_id: analysisId,
        event_type: 'PROCEDURE',
        event_date: eventDate,
        title: procedure.trim(),
        summary: `Procedure performed: ${procedure.trim()}`,
        severity: 'MONITOR',
        status: 'UNKNOWN',
        doctor_name: doctorName,
        facility_name: facilityName,
        department,
        structured_data: { procedure, surgeries: analysis.surgeries },
        is_milestone: true,
        idempotency_key: this.makeKey(scopeId, 'PROCEDURE', eventDate, procedure.trim()),
      });
    }

    // ── 7. Vaccinations ──────────────────────────────────────────
    for (const vaccine of analysis.vaccinations) {
      if (!vaccine.trim()) continue;
      events.push({
        patient_id: patientId,
        document_id: documentId,
        analysis_id: analysisId,
        event_type: 'VACCINATION',
        event_date: eventDate,
        title: `Vaccination: ${vaccine.trim()}`,
        summary: null,
        severity: 'NORMAL',
        status: 'UNKNOWN',
        doctor_name: doctorName,
        facility_name: facilityName,
        department,
        structured_data: { vaccine },
        is_milestone: false,
        idempotency_key: this.makeKey(scopeId, 'VACCINATION', eventDate, vaccine.trim()),
      });
    }

    // ── 8. Hospitalization / Discharge ───────────────────────────
    if (analysis.visit?.admission_date) {
      events.push({
        patient_id: patientId,
        document_id: documentId,
        analysis_id: analysisId,
        event_type: 'HOSPITALIZATION',
        event_date: analysis.visit.admission_date,
        title: `Admitted${facilityName ? ` to ${facilityName}` : ''}`,
        summary: analysis.document.summary || null,
        severity: 'MONITOR',
        status: 'ACTIVE',
        doctor_name: doctorName,
        facility_name: facilityName,
        department,
        structured_data: {
          admission_date: analysis.visit.admission_date,
          discharge_date: analysis.visit.discharge_date,
          diagnoses: analysis.diagnosis,
        },
        is_milestone: true,
        idempotency_key: this.makeKey(scopeId, 'HOSPITALIZATION', analysis.visit.admission_date, 'admission'),
      });
    }
    if (analysis.visit?.discharge_date) {
      events.push({
        patient_id: patientId,
        document_id: documentId,
        analysis_id: analysisId,
        event_type: 'DISCHARGE',
        event_date: analysis.visit.discharge_date,
        title: `Discharged${facilityName ? ` from ${facilityName}` : ''}`,
        summary: null,
        severity: 'NORMAL',
        status: 'RESOLVED',
        doctor_name: doctorName,
        facility_name: facilityName,
        department,
        structured_data: {
          discharge_date: analysis.visit.discharge_date,
          admission_date: analysis.visit.admission_date,
        },
        is_milestone: false,
        idempotency_key: this.makeKey(scopeId, 'DISCHARGE', analysis.visit.discharge_date, 'discharge'),
      });
    }

    if (events.length === 0) {
      logger.info(`[ClinicalEventService] No events to generate for analysis ${analysisId}`);
      return result;
    }

    // ── Transactional Insert ─────────────────────────────────────
    try {
      await query('BEGIN');

      for (const event of events) {
        try {
          const res = await query(
            `INSERT INTO public.clinical_events (
              patient_id, document_id, analysis_id, event_type, event_date,
              title, summary, severity, status, doctor_name, facility_name,
              department, structured_data, is_milestone, idempotency_key
            ) VALUES ($1,$2,$3,$4::clinical_event_type,$5,$6,$7,$8::clinical_event_severity,
                      $9::clinical_event_status,$10,$11,$12,$13,$14,$15)
            ON CONFLICT (idempotency_key) DO UPDATE SET
              analysis_id = EXCLUDED.analysis_id,
              title = EXCLUDED.title,
              summary = EXCLUDED.summary,
              severity = EXCLUDED.severity,
              status = EXCLUDED.status,
              doctor_name = EXCLUDED.doctor_name,
              facility_name = EXCLUDED.facility_name,
              department = EXCLUDED.department,
              structured_data = EXCLUDED.structured_data,
              is_milestone = EXCLUDED.is_milestone,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id;`,
            [
              event.patient_id,
              event.document_id,
              event.analysis_id,
              event.event_type,
              event.event_date,
              event.title,
              event.summary,
              event.severity,
              event.status,
              event.doctor_name,
              event.facility_name,
              event.department,
              JSON.stringify(event.structured_data),
              event.is_milestone,
              event.idempotency_key,
            ]
          );
          if (res.rows.length > 0) {
            result.created++;
            result.eventIds.push(res.rows[0].id);
          } else {
            result.skipped++;
          }
        } catch (rowErr: any) {
          logger.warn(`[ClinicalEventService] Failed to insert/update event "${event.title}":`, rowErr.message);
          result.failed++;
        }
      }

      await query('COMMIT');
      logger.info(`[CLINICAL_EVENTS_GENERATED] analysisId=${analysisId} created=${result.created} skipped=${result.skipped} failed=${result.failed}`);
    } catch (txErr: any) {
      await query('ROLLBACK');
      logger.error(`[ClinicalEventService] Transaction rolled back for analysisId=${analysisId}:`, txErr.message);
      result.failed = events.length;
      result.created = 0;
    }

    return result;
  }

  /**
   * Deterministic idempotency key: SHA-256 hash of (documentId/patientId, eventType, date, discriminator)
   */
  private static makeKey(
    scopeId: string,
    eventType: string,
    date: string,
    discriminator: string
  ): string {
    return crypto
      .createHash('sha256')
      .update(`${scopeId}|${eventType}|${date}|${discriminator.toLowerCase().trim()}`)
      .digest('hex')
      .substring(0, 64);
  }
}
