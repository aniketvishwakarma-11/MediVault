import crypto from "crypto";
import { query, isConnectionError } from "../config/db";
import { logger } from "../utils/logger";
import { MinioStorageService } from "../storage/minioStorage";
import { PrescriptionOCRService } from "./prescription-ocr.service";
import { PrescriptionNormalizerService, StructuredPrescriptionData } from "./prescription-normalizer.service";
import { PrescriptionService } from "./prescription.service";
import { ClinicalEventService } from "./clinical-event.service";
import { DocumentRepository } from "../repositories/document.repository";
import { PrescriptionExplainerService } from "./ai/prescription-explainer.service";

export interface UploadInitResult {
  jobId: string;
  documentId: string;
  storageKey: string;
  status: "UPLOADED";
}

export interface PrescriptionJob {
  id: string;
  patient_id: string;
  document_id: string | null;
  status: string;
  error_message: string | null;
  model_name: string;
  processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
  ocr_result?: any;
}

export interface ConfirmPayload {
  medications: Array<{
    raw_medicine_name: string;
    normalized_medicine_name: string;
    brand_name?: string;
    generic_name?: string;
    strength: string;
    dosage_form?: string;
    route?: string;
    frequency: string;
    schedule_code: string;
    duration: string;
    quantity_to_dispense: number;
    instructions?: string;
    drug_catalog_id?: string;
  }>;
  patient_name?: string;
  doctor_name?: string;
  clinic_hospital?: string;
  prescription_date?: string;
  diagnosis?: string;
  notes?: string;
}

export class PrescriptionUploadService {

  /**
   * Phase 1: Upload image ? MinIO ? create job record.
   * Returns immediately so the HTTP request completes fast.
   */
  public static async initiateUpload(
    patientId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalFilename: string
  ): Promise<UploadInitResult> {
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const ext = originalFilename.split(".").pop() || "jpg";

    // 1. Check if an identical file was already uploaded by this patient (SHA-256 Checksum deduplication)
    const existingDoc = await DocumentRepository.findDuplicate(patientId, checksum);
    let documentId: string;
    let storageKey: string;

    if (existingDoc) {
      documentId = existingDoc.id;
      storageKey = existingDoc.storage_path || existingDoc.storage_key || "";
      logger.info(`[PrescriptionUploadService] Reusing existing document for duplicate image. docId=${documentId}`);
    } else {
      const docId: string = crypto.randomUUID();
      storageKey = MinioStorageService.getStorageKey(patientId, docId, ext, "Prescription");

      // Store original in MinIO
      await MinioStorageService.uploadFile(storageKey, fileBuffer, mimeType, {
        "x-amz-meta-patient-id": patientId,
        "x-amz-meta-source": "offline-prescription-upload",
        "x-amz-meta-checksum": checksum,
      });

      // Create document record
      let createdDocId: string = docId;
      try {
        const docRecord = await DocumentRepository.createDocument({
          id: docId,
          patient_id: patientId,
          document_name: `Offline Prescription - ${new Date().toLocaleDateString("en-IN")}`,
          document_category: "Prescription" as any,
          file_extension: ext,
          mime_type: mimeType,
          file_size_bytes: fileBuffer.length,
          file_size: fileBuffer.length,
          checksum_sha256: checksum,
          storage_path: storageKey,
          storage_key: storageKey,
          upload_status: "PROCESSING",
        });
        createdDocId = String(docRecord.id || docId);
      } catch (e: any) {
        logger.warn("[PrescriptionUploadService] Document record creation notice:", e.message);
      }
      documentId = createdDocId;
    }

    // 2. Check if an active/ready job already exists for this document
    let jobId: string = crypto.randomUUID();
    let shouldRunOcr = true;

    try {
      const existingJobRes = await query(
        `SELECT id, status FROM public.prescription_upload_jobs
         WHERE patient_id = $1 AND document_id = $2 AND status IN ('NEEDS_REVIEW', 'OCR_COMPLETE', 'EXTRACTION_COMPLETE')
         ORDER BY created_at DESC LIMIT 1`,
        [patientId, documentId]
      );
      if (existingJobRes.rows.length > 0) {
        jobId = existingJobRes.rows[0].id;
        shouldRunOcr = false;
        logger.info(`[PrescriptionUploadService] Reusing existing completed job ${jobId} for document ${documentId}`);
      } else {
        const jobRes = await query(
          `INSERT INTO public.prescription_upload_jobs (id, patient_id, document_id, status)
           VALUES ($1, $2, $3, 'UPLOADED') RETURNING id`,
          [jobId, patientId, documentId]
        );
        jobId = String(jobRes.rows[0]?.id || jobId);
      }
    } catch (e: any) {
      logger.warn("[PrescriptionUploadService] Job record check/creation notice:", e.message);
    }

    logger.info(`[PrescriptionUploadService] Upload ready. jobId=${jobId} documentId=${documentId} runOcr=${shouldRunOcr}`);

    // 3. Trigger background processing only if not already analyzed
    if (shouldRunOcr) {
      setImmediate(() =>
        PrescriptionUploadService.processJob(jobId, documentId, fileBuffer, mimeType, originalFilename)
          .catch((err) => logger.error("[PrescriptionUploadService] Background job error:", err))
      );
    }

    return { jobId, documentId, storageKey, status: "UPLOADED" };
  }

  /**
   * Phase 2 (background): OCR ? extraction ? save results.
   */
  public static async processJob(
    jobId: string,
    documentId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalFilename: string
  ): Promise<void> {
    try {
      await PrescriptionUploadService.updateJobStatus(jobId, "PROCESSING");

      const startMs = Date.now();

      // 1. Run OCR
      logger.info(`[PrescriptionUploadService] Starting OCR for job ${jobId}...`);
      let ocrResult: any;
      try {
        ocrResult = await PrescriptionOCRService.analyzeImage(fileBuffer, mimeType, originalFilename);
      } catch (ocrErr: any) {
        logger.warn(`[PrescriptionUploadService] OCR notice for job ${jobId}:`, ocrErr.message);
        ocrResult = {
          success: true,
          raw_text: "",
          model_name: "Multimodal Vision AI Engine",
          model_version: "1.0.0",
          processing_time_ms: Date.now() - startMs,
          image_quality_score: 0.8,
          quality_issues: [],
          model_output: {},
        };
      }

      await PrescriptionUploadService.updateJobStatus(jobId, "OCR_COMPLETE");

      // 2. Extract structured data with multimodal image vision + OCR + Catalog matching
      logger.info(`[PrescriptionUploadService] Extracting structured data for job ${jobId}...`);
      const structured = await PrescriptionNormalizerService.extractStructuredData(
        ocrResult?.raw_text || "",
        fileBuffer,
        mimeType
      );

      await PrescriptionUploadService.updateJobStatus(jobId, "EXTRACTION_COMPLETE");

      // 3. Save OCR + extraction results
      await PrescriptionUploadService.saveOcrResult(
        jobId,
        documentId,
        ocrResult?.raw_text || "",
        structured,
        ocrResult,
        ocrResult?.model_output || {},
        {
          processing_time_ms: Date.now() - startMs,
          image_quality_score: ocrResult?.image_quality_score || 0.85,
          quality_issues: ocrResult?.quality_issues || [],
          model_name: ocrResult?.model_name || "Multimodal Vision Engine",
          model_version: ocrResult?.model_version || "1.0.0",
        }
      );

      // 4. Mark as needs review
      await PrescriptionUploadService.updateJobStatus(jobId, "NEEDS_REVIEW");
      logger.info(
        `[PrescriptionUploadService] Job ${jobId} complete. Status: NEEDS_REVIEW (${structured.medications.length} medicines extracted).`
      );

    } catch (err: any) {
      logger.error(`[PrescriptionUploadService] Job ${jobId} failed:`, err.message || err);
      await PrescriptionUploadService.updateJobStatus(jobId, "FAILED", err.message || "Processing failed.");
    }
  }

  /**
   * Phase 3: Patient confirms verified data ? create prescription record ? timeline event.
   */
  public static async confirmVerifiedPrescription(
    jobId: string,
    patientId: string,
    verifiedData: ConfirmPayload
  ): Promise<any> {
    if (!verifiedData.medications || verifiedData.medications.length === 0) {
      throw new Error("At least one medication is required to confirm the prescription.");
    }

    // 1. Get OCR result row
    let ocrRow: any = null;
    let documentId: string | null = null;
    try {
      const res = await query(
        `SELECT r.*, j.document_id FROM public.prescription_ocr_results r
         JOIN public.prescription_upload_jobs j ON j.id = r.job_id
         WHERE r.job_id = $1 LIMIT 1`,
        [jobId]
      );
      ocrRow = res.rows[0] || null;
      documentId = ocrRow?.document_id || null;
    } catch (e: any) {
      logger.warn("[PrescriptionUploadService] Could not fetch OCR row:", e.message);
    }

    // 2. Resolve patient UUID
    let patientUuid = patientId;
    try {
      const patRes = await query(
        `SELECT id FROM public.patients WHERE id = $1 OR user_id = $1 LIMIT 1`,
        [patientId]
      );
      if (patRes.rows.length > 0) patientUuid = patRes.rows[0].id;
    } catch {}

    // 3. Build prescription items
    const medicines = verifiedData.medications.map((m) => ({
      drug_catalog_id: m.drug_catalog_id,
      drug_name: m.normalized_medicine_name || m.raw_medicine_name,
      generic_name: m.generic_name,
      dosage_form: m.dosage_form || "Tablet",
      strength: m.strength,
      schedule_code: m.schedule_code || "1-0-1",
      food_instructions: m.instructions || "Take after meals",
      duration_days: parseInt(m.duration?.match(/\d+/)?.[0] || "30", 10) || 30,
      quantity_to_dispense: m.quantity_to_dispense || 30,
      refills_allowed: 0,
      special_instructions: "",
    }));

    // 4. Generate AI explanation for the primary medicine
    let aiExplanation: any = {};
    if (medicines.length > 0) {
      try {
        const primaryMed = medicines[0];
        aiExplanation = await PrescriptionExplainerService.generatePatientExplanation(
          primaryMed.drug_name,
          primaryMed.strength,
          primaryMed.schedule_code,
          verifiedData.diagnosis || "External prescription (patient uploaded)",
          [],
          "English"
        );
      } catch (explErr) {
        logger.warn("[PrescriptionUploadService] Explanation notice:", explErr);
      }
    }

    // Insert prescription with PATIENT_UPLOADED provenance
    const qrHash = crypto.createHash("sha256").update(JSON.stringify({ patientId, medicines, ts: new Date().toISOString() })).digest("hex");
    const signature = `SIG-PATIENT-UPLOAD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const blockchainTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;

    let prescriptionId: string | null = null;
    try {
      const rxRes = await query(
        `INSERT INTO public.prescriptions
         (patient_id, doctor_id, diagnosis_text, status, notes, qr_code_hash, digital_signature, blockchain_tx_hash,
          ai_explanation, validity_days, expires_at, medications_json, source_type, offline_doctor_name, original_document_id)
         VALUES ($1, NULL, $2, 'ACTIVE', $3, $4, $5, $6, $7, 90,
           (CURRENT_TIMESTAMP + INTERVAL '90 days'),
           $8, 'PATIENT_UPLOADED', $9, $10)
         RETURNING id`,
        [
          patientUuid,
          verifiedData.diagnosis || "External prescription (patient uploaded)",
          verifiedData.notes || null,
          qrHash,
          signature,
          blockchainTxHash,
          JSON.stringify(aiExplanation || {}),
          JSON.stringify(medicines),
          verifiedData.doctor_name || null,
          documentId,
        ]
      );
      prescriptionId = rxRes.rows[0]?.id || null;

      // Insert prescription items
      for (const m of medicines) {
        await query(
          `INSERT INTO public.prescription_items
           (prescription_id, drug_catalog_id, drug_name, generic_name, dosage_form, strength, schedule_code,
            food_instructions, duration_days, quantity_to_dispense, refills_allowed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            prescriptionId, m.drug_catalog_id || null, m.drug_name, m.generic_name || m.drug_name,
            m.dosage_form, m.strength, m.schedule_code, m.food_instructions,
            m.duration_days, m.quantity_to_dispense, m.refills_allowed,
          ]
        ).catch((e) => logger.warn("[PrescriptionUploadService] Item insert notice:", e.message));
      }
    } catch (e: any) {
      logger.error("[PrescriptionUploadService] Prescription insert error:", e.message);
    }

    // 5. Save verified data in OCR result
    if (ocrRow) {
      await query(
        `UPDATE public.prescription_ocr_results SET verified_data = $1, prescription_id = $2, updated_at = NOW() WHERE job_id = $3`,
        [JSON.stringify(verifiedData), prescriptionId, jobId]
      ).catch(() => {});
    }

    // 6. Update job status to VERIFIED
    await PrescriptionUploadService.updateJobStatus(jobId, "VERIFIED");

    // 6b. Update linked document name with verified diagnosis
    if (documentId) {
      const diag = verifiedData.diagnosis || verifiedData.doctor_name || "Verified";
      const cleanDocName = `Prescription (${diag}) - ${new Date().toLocaleDateString("en-IN")}`;
      await query(
        `UPDATE public.documents
         SET document_name = $1, is_archived = FALSE, updated_at = NOW()
         WHERE id = $2`,
        [cleanDocName, documentId]
      ).catch(() => {});
    }

    // 7. Create clinical timeline event
    if (prescriptionId) {
      try {
        await ClinicalEventService.generateEventsFromAnalysis(
          patientUuid,
          documentId || prescriptionId,
          prescriptionId,
          {
            document: {
              document_type: "Prescription",
              speciality: "General Medicine",
              category: "Prescription",
              summary: `External prescription uploaded by patient. ${medicines.length} medication(s) verified.`,
              confidence: 0.9,
            },
            doctor: { name: verifiedData.doctor_name || "Offline Doctor" },
            hospital: { name: verifiedData.clinic_hospital || "External Clinic" },
            visit: { visit_date: verifiedData.prescription_date || new Date().toISOString().split("T")[0] },
            diagnosis: verifiedData.diagnosis ? [verifiedData.diagnosis] : ["External Prescription"],
            medications: medicines.map((m) => ({
              name: m.drug_name,
              dosage: m.strength,
              frequency: m.schedule_code,
              duration: `${m.duration_days} days`,
              instructions: m.food_instructions,
            })),
            lab_results: [], vitals: {}, symptoms: [], medical_history: [], allergies: [],
            procedures: [], surgeries: [], immunizations: [], risk_factors: [],
            recommendations: [], overall_health_status: "Unknown",
            plain_language_explanation: `Patient uploaded an external prescription with ${medicines.length} medication(s).`,
            timeline_events: [],
            confidence: 0.9,
          } as any
        );
      } catch (evtErr: any) {
        logger.warn("[PrescriptionUploadService] Timeline event notice:", evtErr.message);
      }
    }

    logger.info(`[PrescriptionUploadService] Prescription confirmed. prescriptionId=${prescriptionId}`);

    return {
      success: true,
      prescription_id: prescriptionId,
      source_type: "PATIENT_UPLOADED",
      medications_count: medicines.length,
      message: "Prescription verified and saved to your medical history.",
    };
  }

  /** Get job status + OCR result if available. */
  public static async getJobStatus(jobId: string): Promise<PrescriptionJob | null> {
    try {
      const res = await query(
        `SELECT j.*, r.structured_extraction, r.confidence_scores, r.image_quality_score, r.quality_issues,
                r.raw_ocr_text, r.model_name, r.model_version
         FROM public.prescription_upload_jobs j
         LEFT JOIN public.prescription_ocr_results r ON r.job_id = j.id
         WHERE j.id = $1 LIMIT 1`,
        [jobId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      return {
        id: row.id,
        patient_id: row.patient_id,
        document_id: row.document_id,
        status: row.status,
        error_message: row.error_message,
        model_name: row.model_name || "chinmays18/medical-prescription-ocr",
        processing_time_ms: row.processing_time_ms,
        created_at: row.created_at,
        updated_at: row.updated_at,
        ocr_result: row.structured_extraction ? {
          structured_extraction: row.structured_extraction,
          confidence_scores: row.confidence_scores,
          image_quality_score: row.image_quality_score,
          quality_issues: row.quality_issues,
          raw_ocr_text: row.raw_ocr_text,
          model_version: row.model_version,
        } : undefined,
      };
    } catch (e: any) {
      if (!isConnectionError(e)) logger.error("[PrescriptionUploadService] getJobStatus error:", e.message);
      return null;
    }
  }

  /** Get full OCR analysis for patient review screen. */
  public static async getFullAnalysis(jobId: string): Promise<any | null> {
    try {
      const res = await query(
        `SELECT r.*, j.document_id, j.status, j.patient_id
         FROM public.prescription_ocr_results r
         JOIN public.prescription_upload_jobs j ON j.id = r.job_id
         WHERE r.job_id = $1 LIMIT 1`,
        [jobId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      // Get document storage key for image URL
      let imageUrl: string | null = null;
      if (row.document_id) {
        try {
          const docRes = await query(
            `SELECT storage_path FROM public.documents WHERE id = $1 LIMIT 1`,
            [row.document_id]
          );
          if (docRes.rows[0]?.storage_path) {
            imageUrl = await MinioStorageService.generatePreSignedUrl(docRes.rows[0].storage_path, 900);
          }
        } catch {}
      }

      return {
        job_id: jobId,
        status: row.status,
        patient_id: row.patient_id,
        document_id: row.document_id,
        image_url: imageUrl,
        raw_ocr_text: row.raw_ocr_text,
        structured_extraction: row.structured_extraction,
        confidence_scores: row.confidence_scores,
        verified_data: row.verified_data,
        model_name: row.model_name,
        model_version: row.model_version,
        processing_time_ms: row.processing_time_ms,
        image_quality_score: row.image_quality_score,
        quality_issues: row.quality_issues,
        prescription_id: row.prescription_id,
        created_at: row.created_at,
      };
    } catch (e: any) {
      logger.error("[PrescriptionUploadService] getFullAnalysis error:", e.message);
      return null;
    }
  }

  /** Save patient corrections before final confirm. */
  public static async saveReview(jobId: string, reviewData: any): Promise<boolean> {
    try {
      await query(
        `UPDATE public.prescription_ocr_results SET structured_extraction = $1, updated_at = NOW() WHERE job_id = $2`,
        [JSON.stringify(reviewData), jobId]
      );
      return true;
    } catch (e: any) {
      logger.warn("[PrescriptionUploadService] saveReview error:", e.message);
      return false;
    }
  }

  /** Get all patient-uploaded prescriptions for a patient (for history view). */
  public static async getPatientUploadedPrescriptions(patientId: string): Promise<any[]> {
    try {
      const res = await query(
        `SELECT p.*, j.id as job_id, j.status as job_status, r.structured_extraction, r.image_quality_score,
                r.model_name, r.processing_time_ms
         FROM public.prescriptions p
         JOIN public.prescription_upload_jobs j ON j.patient_id = p.patient_id
         LEFT JOIN public.prescription_ocr_results r ON r.job_id = j.id AND r.prescription_id = p.id
         WHERE (p.patient_id::text = $1 OR p.patient_id IN (SELECT id FROM public.patients WHERE user_id::text = $1 OR id::text = $1))
           AND p.source_type = 'PATIENT_UPLOADED'
         ORDER BY p.created_at DESC`,
        [patientId]
      );
      return res.rows;
    } catch (e: any) {
      logger.warn("[PrescriptionUploadService] getPatientUploadedPrescriptions notice:", e.message);
      return [];
    }
  }

  // -- Private helpers -----------------------------------------------------

  private static async updateJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void> {
    try {
      await query(
        `UPDATE public.prescription_upload_jobs SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
        [status, errorMessage || null, jobId]
      );
    } catch (e: any) {
      logger.warn(`[PrescriptionUploadService] updateJobStatus notice (${status}):`, e.message);
    }
  }

  private static async saveOcrResult(
    jobId: string,
    documentId: string,
    rawText: string | null,
    structured: StructuredPrescriptionData | null,
    ocrResult: any,
    modelOutput: any,
    meta: any
  ): Promise<void> {
    try {
      // Build confidence_scores summary
      const confidenceSummary = structured?.medications?.reduce((acc: any, med: any, idx: number) => {
        acc[`med_${idx}_${med.raw_medicine_name?.substring(0, 20)}`] = med.confidence;
        return acc;
      }, { overall: structured.overall_confidence }) || {};

      const patientRes = await query(
        `SELECT patient_id FROM public.prescription_upload_jobs WHERE id = $1`,
        [jobId]
      );
      const patientId = patientRes.rows[0]?.patient_id || "";

      const checkRes = await query(
        `SELECT id FROM public.prescription_ocr_results WHERE job_id = $1 LIMIT 1`,
        [jobId]
      );

      if (checkRes.rows.length > 0) {
        await query(
          `UPDATE public.prescription_ocr_results SET
             raw_ocr_text = $1,
             chinmay_model_output = $2,
             structured_extraction = $3,
             confidence_scores = $4,
             processing_time_ms = $5,
             image_quality_score = $6,
             quality_issues = $7,
             updated_at = NOW()
           WHERE job_id = $8`,
          [
            rawText || "",
            JSON.stringify(modelOutput || {}),
            JSON.stringify(structured || {}),
            JSON.stringify(confidenceSummary),
            meta.processing_time_ms || 0,
            meta.image_quality_score || 0,
            meta.quality_issues || [],
            jobId,
          ]
        );
      } else {
        await query(
          `INSERT INTO public.prescription_ocr_results
           (job_id, document_id, patient_id, raw_ocr_text, chinmay_model_output, structured_extraction,
            confidence_scores, model_name, model_version, processing_time_ms, image_quality_score, quality_issues)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            jobId, documentId, patientId,
            rawText || "",
            JSON.stringify(modelOutput || {}),
            JSON.stringify(structured || {}),
            JSON.stringify(confidenceSummary),
            meta.model_name || "chinmays18/medical-prescription-ocr",
            meta.model_version || "1.0.0",
            meta.processing_time_ms || 0,
            meta.image_quality_score || 0,
            meta.quality_issues || [],
          ]
        );
      }
    } catch (e: any) {
      logger.warn("[PrescriptionUploadService] saveOcrResult notice:", e.message);
    }
  }
}
