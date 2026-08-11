import { MedicalAIAnalysis, LabResultItem, MedicationItem, ImagingItem } from '../../types/medical_ai';
import { logger } from '../../utils/logger';

/**
 * MediVault V2 — AI Analysis Normalizer Service
 *
 * Accepts raw JSONB from ai_analyses.raw_response_json (which may be from
 * old schema versions or partially structured AI responses) and produces a
 * fully-typed, validated MedicalAIAnalysis object safe for clinical event
 * generation.
 *
 * Never throws — returns null if the input is unrecoverable.
 */
export class NormalizerService {
  /**
   * Normalize raw AI JSON from any historical schema version.
   * Returns null if the JSON is so malformed it cannot be used safely.
   */
  public static normalize(raw: any): MedicalAIAnalysis | null {
    if (!raw || typeof raw !== 'object') {
      logger.warn('[NormalizerService] Received null or non-object input — skipping normalization.');
      return null;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // ── Document ────────────────────────────────────────────────
      const doc = raw.document || {};
      const normalizedDoc: MedicalAIAnalysis['document'] = {
        document_type: this.safeStr(doc.document_type) || this.safeStr(raw.document_type) || 'Medical Report',
        speciality:    this.safeStr(doc.speciality),
        category:      this.safeStr(doc.category),
        summary:       this.safeStr(doc.summary) || this.safeStr(raw.summary) || '',
        language:      this.safeStr(doc.language) || 'English',
        confidence:    this.safeNum(doc.confidence) ?? 0.9,
      };

      // ── Hospital ─────────────────────────────────────────────────
      const hosp = raw.hospital || {};
      const normalizedHospital: MedicalAIAnalysis['hospital'] = {
        name:       this.safeStr(hosp.name),
        address:    this.safeStr(hosp.address),
        department: this.safeStr(hosp.department),
        contact:    this.safeStr(hosp.contact),
      };

      // ── Doctor ───────────────────────────────────────────────────
      const dr = raw.doctor || {};
      const normalizedDoctor: MedicalAIAnalysis['doctor'] = {
        name:                this.safeStr(dr.name),
        qualification:       this.safeStr(dr.qualification),
        specialization:      this.safeStr(dr.specialization),
        registration_number: this.safeStr(dr.registration_number),
      };

      // ── Patient ──────────────────────────────────────────────────
      const pt = raw.patient || {};
      const normalizedPatient: MedicalAIAnalysis['patient'] = {
        name:       this.safeStr(pt.name),
        age:        this.safeNum(pt.age),
        gender:     this.safeStr(pt.gender),
        patient_id: this.safeStr(pt.patient_id),
        dob:        this.safeStr(pt.dob),
      };

      // ── Visit / Encounter ─────────────────────────────────────────
      const visit = raw.visit || {};
      const normalizedVisit: MedicalAIAnalysis['visit'] = {
        visit_date:     this.safeDate(visit.visit_date) || today,
        report_date:    this.safeDate(visit.report_date),
        admission_date: this.safeDate(visit.admission_date),
        discharge_date: this.safeDate(visit.discharge_date),
        encounter_type: this.safeStr(visit.encounter_type),
      };

      // ── Lab Results ───────────────────────────────────────────────
      const normalizedLabResults: LabResultItem[] = this.safeArray(raw.lab_results).map((l: any) => ({
        test_name:       this.safeStr(l.test_name) || 'Unknown Test',
        value:           String(l.value ?? 'N/A'),
        unit:            this.safeStr(l.unit),
        reference_range: this.safeStr(l.reference_range),
        status:          this.normalizeLabStatus(l.status),
        clinical_meaning: this.safeStr(l.clinical_meaning),
        confidence:      this.safeNum(l.confidence),
        test_date:       this.safeDate(l.test_date) || this.safeDate(visit.visit_date) || today,
      }));

      // ── Medications ───────────────────────────────────────────────
      const normalizedMedications: MedicationItem[] = this.safeArray(raw.medications).map((m: any) => ({
        name:        this.safeStr(m.name) || 'Unknown Medication',
        dosage:      this.safeStr(m.dosage),
        frequency:   this.safeStr(m.frequency),
        duration:    this.safeStr(m.duration),
        purpose:     this.safeStr(m.purpose),
        instructions: this.safeStr(m.instructions),
        route:       this.safeStr(m.route),
        start_date:  this.safeDate(m.start_date),
        end_date:    this.safeDate(m.end_date),
        status:      this.safeStr(m.status) || 'last_recorded',
      }));

      // ── Imaging ───────────────────────────────────────────────────
      // Handle both old schema (no imaging field) and new (imaging array)
      const rawImaging = Array.isArray(raw.imaging)
        ? raw.imaging
        : raw.imaging_results
        ? [raw.imaging_results]
        : [];
      const normalizedImaging: ImagingItem[] = rawImaging.map((img: any) => ({
        modality:    this.safeStr(img.modality),
        body_region: this.safeStr(img.body_region || img.region),
        findings:    this.safeStr(img.findings),
        impression:  this.safeStr(img.impression),
        date:        this.safeDate(img.date) || this.safeDate(visit.visit_date),
      }));

      const analysis: MedicalAIAnalysis = {
        document:                normalizedDoc,
        hospital:                normalizedHospital,
        doctor:                  normalizedDoctor,
        patient:                 normalizedPatient,
        visit:                   normalizedVisit,
        diagnosis:               this.safeStringArray(raw.diagnosis),
        symptoms:                this.safeStringArray(raw.symptoms),
        medical_history:         this.safeStringArray(raw.medical_history),
        allergies:               this.safeStringArray(raw.allergies),
        medications:             normalizedMedications,
        lab_results:             normalizedLabResults,
        imaging:                 normalizedImaging,
        vitals:                  typeof raw.vitals === 'object' ? raw.vitals : {},
        procedures:              this.safeStringArray(raw.procedures),
        surgeries:               this.safeStringArray(raw.surgeries),
        vaccinations:            this.safeStringArray(raw.vaccinations),
        recommended_followup:    this.safeStringArray(raw.recommended_followup),
        recommended_tests:       this.safeStringArray(raw.recommended_tests),
        lifestyle_recommendations: this.safeStringArray(raw.lifestyle_recommendations),
        red_flags:               this.safeStringArray(raw.red_flags),
        risk_factors:            this.safeStringArray(raw.risk_factors),
        overall_health_status:   this.safeStr(raw.overall_health_status) || 'STABLE',
        plain_language_explanation: this.safeStr(raw.plain_language_explanation) || '',
        timeline_events:         this.safeArray(raw.timeline_events).map((e: any) => ({
          title:       this.safeStr(e.title) || 'Clinical Event',
          date:        this.safeDate(e.date) || today,
          description: this.safeStr(e.description) || '',
          importance:  ['LOW', 'MEDIUM', 'HIGH'].includes(e.importance) ? e.importance : 'MEDIUM',
        })),
        analysis_timestamp:      this.safeStr(raw.analysis_timestamp) || undefined,
        ai_model:                this.safeStr(raw.ai_model) || undefined,
      };

      return analysis;
    } catch (err: any) {
      logger.error('[NormalizerService] Unexpected normalization error:', err.message || err);
      return null;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────

  private static safeStr(val: any): string | null {
    if (val === null || val === undefined || val === '' || val === 'null') return null;
    return typeof val === 'string' ? val.trim() : String(val).trim();
  }

  private static safeNum(val: any): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }

  private static safeDate(val: any): string | null {
    if (!val) return null;
    const s = String(val).trim();
    // Accept YYYY-MM-DD format only for safety
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10);
    }
    // Try parsing and reformatting
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {}
    return null;
  }

  private static safeArray(val: any): any[] {
    if (!Array.isArray(val)) return [];
    return val.filter((v) => v !== null && v !== undefined);
  }

  private static safeStringArray(val: any): string[] {
    return this.safeArray(val)
      .map((v) => (typeof v === 'string' ? v.trim() : String(v).trim()))
      .filter((v) => v.length > 0);
  }

  private static normalizeLabStatus(val: any): 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' {
    const s = String(val || '').toUpperCase().trim();
    if (['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].includes(s)) {
      return s as 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    }
    // Map common aliases
    if (['ABNORMAL', 'ELEVATED', 'ABOVE'].includes(s)) return 'HIGH';
    if (['BELOW', 'DECREASED', 'DEFICIENT'].includes(s)) return 'LOW';
    if (['URGENT', 'EMERGENCY', 'PANIC'].includes(s)) return 'CRITICAL';
    return 'NORMAL';
  }
}
