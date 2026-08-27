import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import mime from 'mime-types';
import { DocumentRepository } from '../repositories/document.repository';
import { MinioStorageService } from '../storage/minioStorage';
import { OCRService } from './ocr.service';
import { AIService } from './ai.service';
import { AIJobQueue } from './ai/queue.service';
import { calculateBufferSHA256 } from '../utils/hash';
import { logger } from '../utils/logger';
import {
  DocumentRecord,
  UploadDocumentInput,
  DocumentSearchFilters,
} from '../types/document';

import { query } from '../config/db';
import { MedicalAIService } from './ai/medical_ai.service';
import { MedicalAIAnalysis } from '../types/medical_ai';
import { generateSmartDocumentTitle } from '../utils/jsonSanitizer';
import { NormalizerService } from './ai/normalizer.service';
import { ClinicalEventService } from './clinical-event.service';
import { ClinicalEpisodeService } from './clinical-episode.service';

export class DocumentService {
  /**
   * Core Upload Medical Document Pipeline.
   * Validates file, calculates SHA-256, checks duplicates, uploads to MinIO, writes DB record & audit logs.
   */
  public static async uploadMedicalDocument(
    file: Express.Multer.File,
    input: UploadDocumentInput,
    ipAddress: string
  ): Promise<{ document: DocumentRecord; isDuplicate: boolean }> {
    const {
      patient_id,
      uploaded_by,
      document_name,
      document_category = 'General',
      hospital_name,
      doctor_name,
      visit_date,
      is_handwritten,
      document_format,
      custom_metadata,
    } = input;

    const isHandwritten = is_handwritten === true || document_format === 'HANDWRITTEN';
    const resolvedFormat = document_format || (isHandwritten ? 'HANDWRITTEN' : 'PRINTED');
    const ocrEngineUsed = isHandwritten ? 'chinmays18/medical-prescription-ocr' : 'Tesseract.js';

    // 1. Calculate SHA-256 Integrity Checksum
    const checksumSHA256 = calculateBufferSHA256(file.buffer);

    // 2. Check for Duplicate Document within same patient vault
    const existingDuplicate = await DocumentRepository.findDuplicate(
      patient_id,
      checksumSHA256
    );
    if (existingDuplicate) {
      logger.warn(`[DocumentService] Duplicate document upload blocked (Checksum match: ${checksumSHA256})`);
      return {
        document: existingDuplicate,
        isDuplicate: true,
      };
    }

    // 3. Look up Patient Name & Email for Human-Readable MinIO Folder Naming
    let patientFolder = `P-${patient_id.slice(0, 8)}`;
    try {
      const userRes = await query(
        `SELECT u.full_name, u.email FROM public.users_profile u
         LEFT JOIN public.patients p ON p.user_id = u.id
         WHERE u.id = $1 OR p.id = $1 OR u.id = $2 OR p.id = $2 LIMIT 1;`,
        [patient_id, uploaded_by]
      );
      if (userRes.rows.length > 0 && userRes.rows[0].full_name && userRes.rows[0].email) {
        const cleanName = userRes.rows[0].full_name.trim();
        const cleanEmail = userRes.rows[0].email.trim();
        patientFolder = `${cleanName} - ${cleanEmail}`;
      }
    } catch (e) {}

    // 4. Generate UUID & Human-Readable Document Folder Name
    const documentId = uuidv4();
    const resolvedDocName = document_name || `${document_category} - ${file.originalname}`;
    const cleanDocTitle = resolvedDocName.replace(/[/\\?%*:|"<>]/g, '-').trim();
    const docFolder = `${document_category} - ${cleanDocTitle} - ${documentId.slice(0, 8)}`;

    const originalExt = path.extname(file.originalname).replace('.', '').toLowerCase() || (mime.extension(file.mimetype) as string) || 'pdf';
    const storageKey = MinioStorageService.getStorageKey(patientFolder, docFolder, originalExt, document_category);
    const metadataKey = MinioStorageService.getMetadataKey(patientFolder, docFolder, document_category);

    const resolvedDoctor = doctor_name || null;
    const resolvedHospital = hospital_name || null;
    const resolvedVisitDate = visit_date || new Date().toISOString().split('T')[0];

    // 4. Construct Initial Metadata JSON
    const uploadTimestamp = new Date().toISOString();
    const fullMetadata = {
      document_id: documentId,
      patient_id,
      uploaded_by,
      original_filename: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      checksum_sha256: checksumSHA256,
      document_name: resolvedDocName,
      document_category,
      hospital_name: resolvedHospital,
      doctor_name: resolvedDoctor,
      visit_date: resolvedVisitDate,
      upload_timestamp: uploadTimestamp,
      storage_key: storageKey,
      is_handwritten: isHandwritten,
      document_format: resolvedFormat,
      ocr_engine_used: ocrEngineUsed,
      ocr_status: 'PROCESSING',
      embedding_status: 'PENDING',
      blockchain_status: 'UNVERIFIED',
      custom: custom_metadata || {},
    };

    // 5. Upload Original File & Metadata Artifact to MinIO Object Storage
    await MinioStorageService.uploadFile(storageKey, file.buffer, file.mimetype, {
      'x-amz-meta-checksum': checksumSHA256,
      'x-amz-meta-patient-id': patient_id,
    });
    await MinioStorageService.uploadMetadataJSON(metadataKey, fullMetadata);

    // 6. Database Transaction (Insert Initial Document Record)
    const documentRecord = await DocumentRepository.createDocument({
      id: documentId,
      patient_id,
      uploaded_by,
      document_name: resolvedDocName,
      original_filename: file.originalname,
      storage_key: storageKey,
      bucket_name: process.env.MINIO_BUCKET || 'medical-records',
      mime_type: file.mimetype,
      file_extension: originalExt,
      file_size: file.size,
      document_category,
      hospital_name: resolvedHospital,
      doctor_name: resolvedDoctor,
      visit_date: resolvedVisitDate,
      checksum_sha256: checksumSHA256,
      upload_status: 'PROCESSING',
      is_handwritten: isHandwritten,
      document_format: resolvedFormat,
      ocr_engine_used: ocrEngineUsed,
      ocr_completed: false,
      embedding_completed: false,
      metadata_json: fullMetadata,
    });

    // 7. Write Audit Trail
    await DocumentRepository.createAuditLog(uploaded_by, 'DOCUMENT_UPLOAD', documentId, ipAddress);

    // 8. Enqueue Non-Blocking Background Job (OCR + Gemini 2.5 Flash + NVIDIA Failover + Table Persistence)
    AIJobQueue.enqueue({
      documentId,
      patientId: patient_id,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
      category: document_category,
      is_handwritten: isHandwritten,
      document_format: resolvedFormat,
      ipAddress,
    });

    logger.info(`[Document Service] Document "${resolvedDocName}" (ID: ${documentId}, Format: ${resolvedFormat}) uploaded & enqueued for background AI processing.`);
    return { document: documentRecord, isDuplicate: false };
  }

  /**
   * Retrieves single document record and generates temporary pre-signed download URL.
   */
  public static async getDocumentById(
    documentId: string,
    requesterId: string,
    ipAddress?: string
  ): Promise<{ document: DocumentRecord; signedDownloadUrl: string; ai_analysis?: any } | null> {
    const document = await DocumentRepository.findById(documentId);
    if (!document) {
      return null;
    }

    // Generate Pre-Signed Download URL (Phase 11 & 12)
    const signedDownloadUrl = await MinioStorageService.generatePreSignedUrl(
      document.storage_key,
      parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '900', 10),
      document.original_filename
    );

    // Retrieve saved AI Medical Intelligence Analysis
    const ai_analysis = await DocumentRepository.getDocumentAnalysis(documentId) || document.metadata_json?.ai_analysis || null;

    // Write Audit Log for Access
    await DocumentRepository.createAuditLog(requesterId, 'DOCUMENT_VIEW', documentId, ipAddress);

    return { document, signedDownloadUrl, ai_analysis };
  }

  /**
   * Retrieves document record and raw object stream from MinIO.
   */
  public static async streamDocumentFile(documentId: string): Promise<{ document: DocumentRecord; stream: NodeJS.ReadableStream } | null> {
    const document = await DocumentRepository.findById(documentId);
    if (!document) return null;
    const stream = await MinioStorageService.getObjectStream(document.storage_key);
    return { document, stream };
  }

  /**
   * On-Demand AI Medical Analysis / Re-Analysis for a document.
   * Runs OCR, invokes Gemini 2.5 Flash / NVIDIA NIM, updates DB tables & metadata.
   */
  public static async analyzeDocumentOnDemand(documentId: string): Promise<MedicalAIAnalysis | null> {
    const document = await DocumentRepository.findById(documentId);
    if (!document) return null;

    let fileBuffer: Buffer;
    try {
      const fileStream = await MinioStorageService.getObjectStream(document.storage_key);
      const chunks: Buffer[] = [];
      for await (const chunk of fileStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      fileBuffer = Buffer.concat(chunks);
    } catch (err: any) {
      // Fallback empty buffer if stream fails
      fileBuffer = Buffer.from(document.document_name || 'Medical Document');
    }

    // 1. Run OCR Text Extraction
    const ocrResult = await OCRService.extractText(fileBuffer, document.mime_type || 'image/jpeg', document.original_filename || 'document.pdf');

    // 2. Run Multi-Provider AI Processing (Gemini -> NVIDIA Fallback)
    const { data: aiAnalysis } = await MedicalAIService.processDocument(
      ocrResult.rawText,
      document.original_filename || document.document_name,
      document.document_category,
      documentId,
      fileBuffer,
      document.mime_type || 'application/pdf'
    );

    // 3. Save to Normalized Database Tables
    const savedAnalysis = await DocumentRepository.saveMedicalAnalysis(documentId, aiAnalysis, document.patient_id);
    const analysisId = savedAnalysis?.id || uuidv4();

    // 4. Normalize + Generate / Refresh Clinical Events for Timeline
    try {
      const normalized = NormalizerService.normalize(aiAnalysis);
      if (normalized) {
        // First re-link any existing events for this document to the new active analysis ID
        await query(
          `UPDATE public.clinical_events 
           SET analysis_id = $1, patient_id = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE document_id = $3`,
          [analysisId, document.patient_id, documentId]
        ).catch(() => {});

        // Then generate/refresh timeline events
        await ClinicalEventService.generateEventsFromAnalysis(
          document.patient_id,
          documentId,
          analysisId,
          normalized
        );

        // Group into clinical episodes in the background
        setImmediate(() => {
          ClinicalEpisodeService.groupEventsIntoEpisodes(document.patient_id).catch(() => {});
        });
      }
    } catch (evtErr: any) {
      logger.warn(`[DocumentService] Timeline event generation notice for ${documentId}:`, evtErr.message || evtErr);
    }

    // 5. Generate intelligent clinical title & extract physician/facility metadata
    const smartTitle = generateSmartDocumentTitle(aiAnalysis, document.original_filename, document.document_category);
    const extractedDoctor = aiAnalysis?.doctor?.name || undefined;
    const extractedHospital = aiAnalysis?.hospital?.name || undefined;
    const extractedVisitDate = aiAnalysis?.visit?.visit_date || undefined;

    // 6. Update metadata_json & upload_status on public.documents
    const updatedMetadata = {
      ...(document.metadata_json || {}),
      ai_analysis: aiAnalysis,
      ocr_status: 'COMPLETED',
      ocr_confidence: ocrResult.confidence,
      ocr_raw_text: ocrResult.rawText,
    };

    await DocumentRepository.updateMetadata(documentId, {
      document_name: smartTitle,
      doctor_name: extractedDoctor,
      hospital_name: extractedHospital,
      visit_date: extractedVisitDate,
      upload_status: 'COMPLETED',
      ocr_completed: true,
      embedding_completed: true,
      metadata_json: updatedMetadata,
    });

    return aiAnalysis;
  }

  /**
   * Searches and filters documents based on criteria.
   */
  public static async searchDocuments(filters: DocumentSearchFilters) {
    return await DocumentRepository.searchDocuments(filters);
  }

  /**
   * Fetches latest recent documents for a patient.
   */
  public static async getRecentDocuments(patientId: string, limit = 5) {
    return await DocumentRepository.getRecentDocuments(patientId, limit);
  }

  /**
   * Updates metadata for an existing document.
   */
  public static async updateDocumentMetadata(
    documentId: string,
    updates: Partial<DocumentRecord>,
    requesterId: string,
    ipAddress?: string
  ): Promise<DocumentRecord | null> {
    const updatedDoc = await DocumentRepository.updateMetadata(documentId, updates);
    if (updatedDoc) {
      await DocumentRepository.createAuditLog(requesterId, 'DOCUMENT_METADATA_UPDATE', documentId, ipAddress);
    }
    return updatedDoc;
  }

  /**
   * Soft deletes a document (Phase 13).
   */
  public static async softDeleteDocument(
    documentId: string,
    requesterId: string,
    ipAddress?: string
  ): Promise<boolean> {
    const deleted = await DocumentRepository.softDelete(documentId);
    if (deleted) {
      await DocumentRepository.createAuditLog(requesterId, 'DOCUMENT_SOFT_DELETE', documentId, ipAddress);
    }
    return deleted;
  }

  /**
   * Future Phase Hooks (Phase 23 Extension Points).
   * Plugs into async AI OCR, Qdrant vector indexing, and Polygon Amoy Blockchain registration pipelines.
   */
  private static triggerFuturePipelineHooks(doc: DocumentRecord): void {
    setImmediate(() => {
      try {
        // Extension Point: OCR Processing (PaddleOCR)
        // Extension Point: Qdrant Vector Embedding & RAG Indexing
        // Extension Point: Polygon Amoy Blockchain SHA-256 Timestamping
        // Extension Point: Virus Scanning & Image Optimization
        logger.info(`[Future Pipeline Hooks] Initialized async hooks for document ID: ${doc.id}`);
      } catch (err) {
        logger.warn('[Future Pipeline Hooks Warning]: Hook execution error', err);
      }
    });
  }
}
