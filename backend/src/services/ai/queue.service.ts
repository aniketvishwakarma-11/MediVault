import { OCRService } from '../ocr.service';
import { PrescriptionOCRService } from '../prescription-ocr.service';
import { MedicalAIService } from './medical_ai.service';
import { DocumentRepository } from '../../repositories/document.repository';
import { NormalizerService } from './normalizer.service';
import { ClinicalEventService } from '../clinical-event.service';
import { logger } from '../../utils/logger';
import { generateSmartDocumentTitle } from '../../utils/jsonSanitizer';

export interface DocumentJobPayload {
  documentId: string;
  patientId: string;
  fileBuffer: Buffer;
  mimeType: string;
  originalFilename: string;
  category?: string;
  is_handwritten?: boolean;
  document_format?: string;
  ipAddress?: string;
}

export class AIJobQueue {
  private static queue: DocumentJobPayload[] = [];
  private static isProcessing = false;

  /**
   * Enqueues a background document processing job.
   * Returns immediately so HTTP upload requests complete with 0 AI latency.
   */
  public static enqueue(job: DocumentJobPayload): void {
    this.queue.push(job);
    logger.info(`[AI Job Queue] Job enqueued for document ID: ${job.documentId} (Format: ${job.document_format || (job.is_handwritten ? 'HANDWRITTEN' : 'PRINTED')}, Queue size: ${this.queue.length}).`);
    
    // Trigger background processing asynchronously
    setImmediate(() => this.processNextJob());
  }

  private static async processNextJob(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift()!;

    try {
      const isHandwritten = job.is_handwritten === true || job.document_format === 'HANDWRITTEN';
      logger.info(`[AI Job Queue] Starting background AI processing for document ID: ${job.documentId} (Handwritten: ${isHandwritten})...`);

      let rawOcrText = '';
      let ocrEngineUsed = isHandwritten ? 'chinmays18/medical-prescription-ocr' : 'Tesseract.js';
      let ocrConfidence = 0.9;

      // 1. Phase 1 — OCR Text Extraction (Chinmay TrOCR for handwritten vs Tesseract for printed)
      if (isHandwritten) {
        try {
          logger.info(`[AI Job Queue] Routing handwritten document ${job.documentId} to Chinmay TrOCR microservice...`);
          const trOcrResult = await PrescriptionOCRService.analyzeImage(job.fileBuffer, job.mimeType, job.originalFilename);
          if (trOcrResult.success && trOcrResult.raw_text && trOcrResult.raw_text.trim().length > 0) {
            rawOcrText = trOcrResult.raw_text.trim();
            ocrEngineUsed = trOcrResult.model_name || 'chinmays18/medical-prescription-ocr';
            ocrConfidence = trOcrResult.image_quality_score || 0.92;
            logger.info(`[AI Job Queue] Chinmay TrOCR extracted ${rawOcrText.length} chars from handwritten document.`);
          }
        } catch (trErr: any) {
          logger.warn(`[AI Job Queue] TrOCR microservice notice for ${job.documentId}: ${trErr.message || trErr}`);
        }
      }

      // If TrOCR was not used or yielded empty text, run standard in-process OCR as fallback
      if (!rawOcrText || rawOcrText.trim().length === 0) {
        logger.info(`[AI Job Queue] Running in-process OCR engine for document ID: ${job.documentId}...`);
        const standardOcr = await OCRService.extractText(job.fileBuffer, job.mimeType, job.originalFilename);
        rawOcrText = standardOcr.rawText;
        ocrConfidence = standardOcr.confidence;
        if (!isHandwritten) {
          ocrEngineUsed = 'Tesseract.js';
        }
      }

      // 2. Phase 2 — Multi-Provider Medical AI Processing (Gemini -> Retry -> NVIDIA Fallback)
      const { data: aiAnalysis } = await MedicalAIService.processDocument(
        rawOcrText,
        job.originalFilename,
        job.category,
        job.documentId,
        job.fileBuffer,
        job.mimeType
      );

      // Attach OCR and format provenance to AI analysis
      if (aiAnalysis && aiAnalysis.document) {
        aiAnalysis.document.category = job.category || aiAnalysis.document.category;
      }

      // 3. Phase 3 — Database Persistence (ai_analyses table)
      const savedAnalysis = await DocumentRepository.saveMedicalAnalysis(job.documentId, aiAnalysis, job.patientId);
      const analysisId: string = savedAnalysis?.id || 'unknown';

      // 4. Phase 4 — Normalize + Generate Clinical Events (V2 Longitudinal Timeline)
      try {
        const normalized = NormalizerService.normalize(aiAnalysis);
        if (normalized) {
          const eventResult = await ClinicalEventService.generateEventsFromAnalysis(
            job.patientId,
            job.documentId,
            analysisId,
            normalized
          );
          logger.info(`[CLINICAL_EVENTS_GENERATED] documentId=${job.documentId} created=${eventResult.created} skipped=${eventResult.skipped}`);
        } else {
          logger.warn(`[AI Job Queue] Normalization returned null for document ${job.documentId} — clinical events skipped.`);
        }
      } catch (eventErr: any) {
        // Clinical event generation failure must never block document upload completion
        logger.error(`[AI Job Queue] Clinical event generation error for document ${job.documentId}:`, eventErr.message || eventErr);
      }

      // 5. Generate intelligent clinical title & extract physician/facility metadata
      const smartTitle = generateSmartDocumentTitle(aiAnalysis, job.originalFilename, job.category);
      const extractedDoctor = aiAnalysis?.doctor?.name || undefined;
      const extractedHospital = aiAnalysis?.hospital?.name || undefined;
      const extractedVisitDate = aiAnalysis?.visit?.visit_date || undefined;

      const docRecord = await DocumentRepository.findById(job.documentId);
      const updatedMetadata = {
        ...(docRecord?.metadata_json || {}),
        ai_analysis: aiAnalysis,
        is_handwritten: isHandwritten,
        document_format: job.document_format || (isHandwritten ? 'HANDWRITTEN' : 'PRINTED'),
        ocr_engine_used: ocrEngineUsed,
        ocr_confidence: ocrConfidence,
        ocr_raw_text: rawOcrText,
        ocr_status: 'COMPLETED',
      };

      await DocumentRepository.updateMetadata(job.documentId, {
        document_name: smartTitle,
        doctor_name: extractedDoctor,
        hospital_name: extractedHospital,
        visit_date: extractedVisitDate,
        upload_status: 'COMPLETED',
        ocr_completed: true,
        embedding_completed: true,
        metadata_json: updatedMetadata,
      });

      logger.info(`[AI Job Queue] Job completed successfully for document ID: ${job.documentId} (Title: "${smartTitle}", Engine: ${ocrEngineUsed}).`);
    } catch (error: any) {
      logger.error(`[AI Job Queue Error] Failed background job for document ID ${job.documentId}:`, error);
      await DocumentRepository.updateMetadata(job.documentId, {
        upload_status: 'FAILED',
      });
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNextJob());
      }
    }
  }

  public static getQueueStatus(): { size: number; isProcessing: boolean } {
    return {
      size: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }
}
