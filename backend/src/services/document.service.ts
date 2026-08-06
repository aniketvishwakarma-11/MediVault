import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import mime from 'mime-types';
import { DocumentRepository } from '../repositories/document.repository';
import { MinioStorageService } from '../storage/minioStorage';
import { calculateBufferSHA256 } from '../utils/hash';
import { logger } from '../utils/logger';
import {
  DocumentRecord,
  UploadDocumentInput,
  DocumentSearchFilters,
} from '../types/document';

export class DocumentService {
  /**
   * Core Upload Medical Document Pipeline.
   * Validates file, calculates SHA-256, checks duplicates, uploads to MinIO, writes DB record & audit logs.
   */
  public static async uploadMedicalDocument(
    file: Express.Multer.File,
    input: UploadDocumentInput,
    ipAddress?: string
  ): Promise<{ document: DocumentRecord; isDuplicate?: boolean }> {
    const { patient_id, uploaded_by, document_name, document_category, hospital_name, doctor_name, visit_date, custom_metadata } = input;

    // 1. Calculate SHA-256 Checksum
    const checksumSHA256 = calculateBufferSHA256(file.buffer);

    // 2. Duplicate Detection (Phase 17)
    const existingDuplicate = await DocumentRepository.findDuplicate(patient_id, checksumSHA256);
    if (existingDuplicate) {
      logger.info(`[Duplicate Upload Detected] Document "${document_name}" matching checksum ${checksumSHA256} already exists for patient ${patient_id}.`);
      return {
        document: existingDuplicate,
        isDuplicate: true,
      };
    }

    // 3. Generate UUID & Storage Key Layout (Phase 7)
    const documentId = uuidv4();
    const originalExt = path.extname(file.originalname).replace('.', '').toLowerCase() || (mime.extension(file.mimetype) as string) || 'pdf';
    const storageKey = MinioStorageService.getStorageKey(patient_id, documentId, originalExt);
    const metadataKey = MinioStorageService.getMetadataKey(patient_id, documentId);

    // 4. Construct Comprehensive Metadata JSON (Phase 10)
    const uploadTimestamp = new Date().toISOString();
    const fullMetadata = {
      document_id: documentId,
      patient_id,
      uploaded_by,
      original_filename: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      checksum_sha256: checksumSHA256,
      document_name,
      document_category,
      hospital_name: hospital_name || null,
      doctor_name: doctor_name || null,
      visit_date: visit_date || null,
      upload_timestamp: uploadTimestamp,
      storage_key: storageKey,
      ocr_status: 'PENDING',
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

    // 6. Database Transaction (Insert Record into public.documents)
    const documentRecord = await DocumentRepository.createDocument({
      id: documentId,
      patient_id,
      uploaded_by,
      document_name,
      original_filename: file.originalname,
      storage_key: storageKey,
      bucket_name: process.env.MINIO_BUCKET || 'medical-records',
      mime_type: file.mimetype,
      file_extension: originalExt,
      file_size: file.size,
      document_category,
      hospital_name: hospital_name || null,
      doctor_name: doctor_name || null,
      visit_date: visit_date || null,
      checksum_sha256: checksumSHA256,
      upload_status: 'COMPLETED',
      ocr_completed: false,
      embedding_completed: false,
      metadata_json: fullMetadata,
    });

    // 7. Write Audit Trail (Phase 21)
    await DocumentRepository.createAuditLog(uploaded_by, 'DOCUMENT_UPLOAD', documentId, ipAddress);

    // 8. Trigger Future Pipeline Hooks asynchronously (Phase 23)
    this.triggerFuturePipelineHooks(documentRecord);

    logger.info(`[Document Service] Document "${document_name}" (ID: ${documentId}) uploaded successfully.`);
    return { document: documentRecord, isDuplicate: false };
  }

  /**
   * Retrieves single document record and generates temporary pre-signed download URL.
   */
  public static async getDocumentById(
    documentId: string,
    requesterId: string,
    ipAddress?: string
  ): Promise<{ document: DocumentRecord; signedDownloadUrl: string } | null> {
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

    // Write Audit Log for Access
    await DocumentRepository.createAuditLog(requesterId, 'DOCUMENT_VIEW', documentId, ipAddress);

    return { document, signedDownloadUrl };
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
