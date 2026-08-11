import { OCRService } from '../ocr.service';
import { MedicalAIService } from './medical_ai.service';
import { DocumentRepository } from '../../repositories/document.repository';
import { NormalizerService } from './normalizer.service';
import { ClinicalEventService } from '../clinical-event.service';
import { logger } from '../../utils/logger';

export interface DocumentJobPayload {
  documentId: string;
  patientId: string;
  fileBuffer: Buffer;
  mimeType: string;
  originalFilename: string;
  category?: string;
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
    logger.info(`[AI Job Queue] Job enqueued for document ID: ${job.documentId} (Queue size: ${this.queue.length}).`);
    
    // Trigger background processing asynchronously
    setImmediate(() => this.processNextJob());
  }

  private static async processNextJob(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift()!;

    try {
      logger.info(`[AI Job Queue] Starting background AI processing for document ID: ${job.documentId}...`);

      // 1. Phase 1 — OCR Text Extraction
      const ocrResult = await OCRService.extractText(job.fileBuffer, job.mimeType, job.originalFilename);

      // 2. Phase 2 — Multi-Provider Medical AI Processing (Gemini -> Retry -> NVIDIA Fallback)
      const { data: aiAnalysis } = await MedicalAIService.processDocument(
        ocrResult.rawText,
        job.originalFilename,
        job.category,
        job.documentId
      );

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

      // 5. Update Document upload_status to 'COMPLETED'
      await DocumentRepository.updateMetadata(job.documentId, {
        upload_status: 'COMPLETED',
        ocr_completed: true,
        embedding_completed: true,
      });

      logger.info(`[AI Job Queue] Job completed successfully for document ID: ${job.documentId}.`);
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
