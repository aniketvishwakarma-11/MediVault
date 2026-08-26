import { Request, Response } from "express";
import { PrescriptionUploadService } from "../services/prescription-upload.service";
import { PrescriptionOCRService } from "../services/prescription-ocr.service";
import { DrugCatalogService } from "../services/drug-catalog.service";
import { PrescriptionExplainerService } from "../services/ai/prescription-explainer.service";
import { sendSuccess, sendError } from "../utils/response";
import { logger } from "../utils/logger";

export class PrescriptionOCRController {

  /**
   * POST /api/prescriptions/upload-offline
   * Patient uploads an offline prescription image.
   */
  public static async uploadOfflinePrescription(req: Request, res: Response): Promise<void> {
    try {
      const patientId = String((req as any).user?.id || req.body.patient_id || "pat-demo");

      if (!req.file) {
        sendError(res, 400, "No file uploaded. Please attach a prescription image.");
        return;
      }

      const { buffer, mimetype, originalname } = req.file;
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(mimetype)) {
        sendError(res, 400, `Unsupported file type: ${mimetype}. Supported: JPG, PNG, WEBP, PDF.`);
        return;
      }

      const result = await PrescriptionUploadService.initiateUpload(patientId, buffer, mimetype, originalname);

      sendSuccess(res, 202, result, "Prescription uploaded. Analysis starting in background.");
    } catch (err: any) {
      logger.error("[PrescriptionOCRController.uploadOfflinePrescription] Error:", err);
      sendError(res, 500, err.message || "Failed to upload prescription.");
    }
  }

  /**
   * GET /api/prescriptions/upload-job/:jobId
   * Poll job status.
   */
  public static async getUploadJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const jobId = String(req.params.jobId);
      const job = await PrescriptionUploadService.getJobStatus(jobId);

      if (!job) {
        sendError(res, 404, "Upload job not found.");
        return;
      }

      sendSuccess(res, 200, job);
    } catch (err: any) {
      logger.error("[PrescriptionOCRController.getUploadJobStatus] Error:", err);
      sendError(res, 500, "Failed to fetch job status.");
    }
  }

  /**
   * GET /api/prescriptions/ocr/:jobId/analysis
   * Get full OCR analysis for patient review screen.
   */
  public static async getOcrAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const jobId = String(req.params.jobId);
      const analysis = await PrescriptionUploadService.getFullAnalysis(jobId);

      if (!analysis) {
        sendError(res, 404, "Analysis not found. Job may still be processing.");
        return;
      }

      sendSuccess(res, 200, analysis);
    } catch (err: any) {
      logger.error("[PrescriptionOCRController.getOcrAnalysis] Error:", err);
      sendError(res, 500, "Failed to fetch analysis.");
    }
  }

  /**
   * PATCH /api/prescriptions/ocr/:jobId/review
   * Patient saves corrections before confirming.
   */
  public static async savePrescriptionReview(req: Request, res: Response): Promise<void> {
    try {
      const jobId = String(req.params.jobId);
      const reviewData = req.body;

      if (!reviewData || Object.keys(reviewData).length === 0) {
        sendError(res, 400, "Review data is required.");
        return;
      }

      const saved = await PrescriptionUploadService.saveReview(jobId, reviewData);
      sendSuccess(res, 200, { saved }, saved ? "Review saved." : "Could not save review.");
    } catch (err: any) {
      logger.error("[PrescriptionOCRController.savePrescriptionReview] Error:", err);
      sendError(res, 500, "Failed to save review.");
    }
  }

  /**
   * POST /api/prescriptions/ocr/:jobId/confirm
   * Patient confirms verified prescription ? saves to medical history + timeline.
   */
  public static async confirmPrescription(req: Request, res: Response): Promise<void> {
    try {
      const jobId = String(req.params.jobId);
      const patientId = String((req as any).user?.id || req.body.patient_id || "pat-demo");
      const { medications, patient_name, doctor_name, clinic_hospital, prescription_date, diagnosis, notes } = req.body;

      if (!medications || medications.length === 0) {
        sendError(res, 400, "At least one medication is required.");
        return;
      }

      const result = await PrescriptionUploadService.confirmVerifiedPrescription(jobId, patientId, {
        medications,
        patient_name,
        doctor_name,
        clinic_hospital,
        prescription_date,
        diagnosis,
        notes,
      });

      sendSuccess(res, 201, result, "Prescription verified and added to your medical history.");
    } catch (err: any) {
      logger.error("[PrescriptionOCRController.confirmPrescription] Error:", err);
      sendError(res, 500, err.message || "Failed to confirm prescription.");
    }
  }

  /**
   * GET /api/prescriptions/ocr/:jobId/medicine-info/:drugCatalogId
   * Get detailed medicine intelligence for a drug catalog entry.
   */
  public static async getMedicineIntelligence(req: Request, res: Response): Promise<void> {
    try {
      const drugCatalogId = String(req.params.drugCatalogId);
      const { schedule_code, diagnosis } = req.query;

      const drug = await DrugCatalogService.getDrugById(drugCatalogId);
      if (!drug) {
        sendError(res, 404, "Drug not found in catalog.");
        return;
      }

      // Get patient-friendly explanation
      let explanation = null;
      try {
        explanation = await PrescriptionExplainerService.generatePatientExplanation(
          drug.generic_name,
          drug.strength,
          (schedule_code as string) || drug.default_schedule,
          (diagnosis as string) || "General Health",
          [],
          "English"
        );
      } catch {}

      // Get generic alternatives
      let alternatives = null;
      try {
        alternatives = await DrugCatalogService.getGenericAlternatives(drug.generic_name);
      } catch {}

      sendSuccess(res, 200, {
        drug,
        explanation,
        alternatives,
        safety: {
          contraindications: drug.contraindications || [],
          allergy_classes: drug.allergy_classes || [],
        },
        pricing: {
          jan_aushadhi_price: drug.jan_aushadhi_price,
          market_brand_price: drug.market_brand_price,
          potential_savings_pct: drug.market_brand_price && drug.jan_aushadhi_price
            ? Math.round(((drug.market_brand_price - drug.jan_aushadhi_price) / drug.market_brand_price) * 100)
            : null,
        },
      });
    } catch (err: any) {
      logger.error("[PrescriptionOCRController.getMedicineIntelligence] Error:", err);
      sendError(res, 500, "Failed to fetch medicine information.");
    }
  }

  /**
   * GET /api/prescriptions/patient/:id/external
   * Get all patient-uploaded prescriptions for a patient (for doctor view).
   */
  public static async getExternalPrescriptions(req: Request, res: Response): Promise<void> {
    try {
      const patientId = String(req.params.id || (req as any).user?.id || "pat-demo");
      const list = await PrescriptionUploadService.getPatientUploadedPrescriptions(patientId);
      sendSuccess(res, 200, { prescriptions: list, count: list.length });
    } catch (err: any) {
      logger.error("[PrescriptionOCRController.getExternalPrescriptions] Error:", err);
      sendError(res, 500, "Failed to fetch external prescriptions.");
    }
  }

  /**
   * GET /api/prescriptions/ocr/service-health
   * Check if the Python OCR service is running.
   */
  public static async getOcrServiceHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await PrescriptionOCRService.checkHealth();
      sendSuccess(res, 200, health);
    } catch (err: any) {
      sendError(res, 500, "Failed to check OCR service health.");
    }
  }
}
