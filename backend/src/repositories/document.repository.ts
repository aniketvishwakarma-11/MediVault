import { query, isConnectionError } from '../config/db';
import { DocumentRecord, DocumentSearchFilters } from '../types/document';
import { logger } from '../utils/logger';

// In-Memory Documents Store (Active when local PostgreSQL service is disconnected / unreachable)
const inMemoryDocuments: DocumentRecord[] = [];

let warnedFallback = false;

function logFallbackWarning(err: any) {
  if (!warnedFallback) {
    logger.warn('[PostgreSQL DB Warning]: Local PostgreSQL database unavailable. Operating with active in-memory document store.');
    warnedFallback = true;
  }
}

export class DocumentRepository {
  /**
   * Inserts a new document record into public.documents table.
   */
  public static async createDocument(doc: Partial<DocumentRecord>): Promise<DocumentRecord> {
    const now = new Date().toISOString();
    const newDocRecord: DocumentRecord = {
      id: doc.id || 'doc-' + Date.now(),
      patient_id: doc.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d',
      uploaded_by: doc.uploaded_by || doc.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d',
      document_name: doc.document_name || 'Untitled Document',
      original_filename: doc.original_filename || 'document.pdf',
      storage_key: doc.storage_key || '',
      bucket_name: doc.bucket_name || 'medical-records',
      mime_type: doc.mime_type || 'application/pdf',
      file_extension: doc.file_extension || 'pdf',
      file_size: doc.file_size || 0,
      document_category: doc.document_category || 'Other',
      hospital_name: doc.hospital_name || null,
      doctor_name: doc.doctor_name || null,
      visit_date: doc.visit_date || null,
      checksum_sha256: doc.checksum_sha256 || '',
      upload_status: doc.upload_status || 'COMPLETED',
      is_deleted: false,
      created_at: now,
      updated_at: now,
      blockchain_hash: doc.blockchain_hash || null,
      blockchain_tx: doc.blockchain_tx || null,
      ocr_completed: doc.ocr_completed || false,
      embedding_completed: doc.embedding_completed || false,
      metadata_json: doc.metadata_json || null,
    };

    try {
      const sql = `
        INSERT INTO public.documents (
          id, patient_id, uploaded_by, document_name, original_filename, storage_key,
          bucket_name, mime_type, file_extension, file_size, document_category,
          hospital_name, doctor_name, visit_date, checksum_sha256, upload_status,
          is_deleted, created_at, updated_at, blockchain_hash, blockchain_tx,
          ocr_completed, embedding_completed, metadata_json
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $17, $18, $19, $20, $21
        )
        RETURNING *;
      `;

      const values = [
        newDocRecord.id,
        newDocRecord.patient_id,
        newDocRecord.uploaded_by,
        newDocRecord.document_name,
        newDocRecord.original_filename,
        newDocRecord.storage_key,
        newDocRecord.bucket_name,
        newDocRecord.mime_type,
        newDocRecord.file_extension,
        newDocRecord.file_size,
        newDocRecord.document_category,
        newDocRecord.hospital_name,
        newDocRecord.doctor_name,
        newDocRecord.visit_date,
        newDocRecord.checksum_sha256,
        newDocRecord.upload_status,
        newDocRecord.blockchain_hash,
        newDocRecord.blockchain_tx,
        newDocRecord.ocr_completed,
        newDocRecord.embedding_completed,
        newDocRecord.metadata_json ? JSON.stringify(newDocRecord.metadata_json) : null,
      ];

      const result = await query(sql, values);
      // Synchronize in-memory fallback as well
      inMemoryDocuments.unshift(result.rows[0]);
      return result.rows[0];
    } catch (err: any) {
      if (isConnectionError(err)) {
        logFallbackWarning(err);
        inMemoryDocuments.unshift(newDocRecord);
        return newDocRecord;
      }
      throw err;
    }
  }

  /**
   * Retrieves a non-deleted document by its ID.
   */
  public static async findById(id: string): Promise<DocumentRecord | null> {
    try {
      const sql = `SELECT * FROM public.documents WHERE id = $1 AND is_deleted = FALSE`;
      const result = await query(sql, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err: any) {
      if (isConnectionError(err)) {
        logFallbackWarning(err);
        return inMemoryDocuments.find((d) => d.id === id && !d.is_deleted) || null;
      }
      throw err;
    }
  }

  /**
   * Checks if a document with identical SHA-256 checksum already exists for the patient.
   */
  public static async findDuplicate(patientId: string, checksumSHA256: string): Promise<DocumentRecord | null> {
    try {
      const sql = `
        SELECT * FROM public.documents 
        WHERE patient_id = $1 AND checksum_sha256 = $2 AND is_deleted = FALSE 
        LIMIT 1;
      `;
      const result = await query(sql, [patientId, checksumSHA256]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err: any) {
      if (isConnectionError(err)) {
        logFallbackWarning(err);
        return (
          inMemoryDocuments.find(
            (d) => d.patient_id === patientId && d.checksum_sha256 === checksumSHA256 && !d.is_deleted
          ) || null
        );
      }
      throw err;
    }
  }

  /**
   * Searches and filters patient documents with pagination support.
   */
  public static async searchDocuments(filters: DocumentSearchFilters): Promise<{
    documents: DocumentRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
    const offset = (page - 1) * limit;

    try {
      const conditions: string[] = ['is_deleted = FALSE'];
      const params: any[] = [];

      if (filters.patient_id) {
        params.push(filters.patient_id);
        conditions.push(`patient_id = $${params.length}`);
      }

      if (filters.document_category) {
        params.push(filters.document_category);
        conditions.push(`document_category = $${params.length}`);
      }

      if (filters.hospital_name) {
        params.push(`%${filters.hospital_name}%`);
        conditions.push(`hospital_name ILIKE $${params.length}`);
      }

      if (filters.doctor_name) {
        params.push(`%${filters.doctor_name}%`);
        conditions.push(`doctor_name ILIKE $${params.length}`);
      }

      if (filters.visit_date_from) {
        params.push(filters.visit_date_from);
        conditions.push(`visit_date >= $${params.length}`);
      }

      if (filters.visit_date_to) {
        params.push(filters.visit_date_to);
        conditions.push(`visit_date <= $${params.length}`);
      }

      if (filters.upload_date_from) {
        params.push(filters.upload_date_from);
        conditions.push(`created_at >= $${params.length}`);
      }

      if (filters.upload_date_to) {
        params.push(filters.upload_date_to);
        conditions.push(`created_at <= $${params.length}`);
      }

      if (filters.mime_type) {
        params.push(filters.mime_type);
        conditions.push(`mime_type = $${params.length}`);
      }

      if (filters.search_query) {
        params.push(`%${filters.search_query}%`);
        conditions.push(`(document_name ILIKE $${params.length} OR original_filename ILIKE $${params.length})`);
      }

      const whereClause = conditions.join(' AND ');

      // Count Total Query
      const countSql = `SELECT COUNT(*) FROM public.documents WHERE ${whereClause}`;
      const countResult = await query(countSql, params);
      const total = parseInt(countResult.rows[0].count, 10);

      // Fetch Paginated Documents Query
      const fetchSql = `
        SELECT * FROM public.documents 
        WHERE ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT $${params.length + 1} OFFSET $${params.length + 2};
      `;
      const fetchParams = [...params, limit, offset];
      const fetchResult = await query(fetchSql, fetchParams);

      const totalPages = Math.ceil(total / limit) || 1;

      return {
        documents: fetchResult.rows,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (err: any) {
      if (isConnectionError(err)) {
        logFallbackWarning(err);

        // In-Memory Filtering & Pagination
        let filtered = inMemoryDocuments.filter((d) => !d.is_deleted);

        if (filters.patient_id) {
          filtered = filtered.filter((d) => d.patient_id === filters.patient_id);
        }
        if (filters.document_category) {
          filtered = filtered.filter((d) => d.document_category === filters.document_category);
        }
        if (filters.hospital_name) {
          const q = filters.hospital_name.toLowerCase();
          filtered = filtered.filter((d) => d.hospital_name?.toLowerCase().includes(q));
        }
        if (filters.doctor_name) {
          const q = filters.doctor_name.toLowerCase();
          filtered = filtered.filter((d) => d.doctor_name?.toLowerCase().includes(q));
        }
        if (filters.visit_date_from) {
          filtered = filtered.filter((d) => d.visit_date && d.visit_date >= filters.visit_date_from!);
        }
        if (filters.visit_date_to) {
          filtered = filtered.filter((d) => d.visit_date && d.visit_date <= filters.visit_date_to!);
        }
        if (filters.upload_date_from) {
          filtered = filtered.filter((d) => d.created_at >= filters.upload_date_from!);
        }
        if (filters.upload_date_to) {
          filtered = filtered.filter((d) => d.created_at <= filters.upload_date_to!);
        }
        if (filters.mime_type) {
          filtered = filtered.filter((d) => d.mime_type === filters.mime_type);
        }
        if (filters.search_query) {
          const q = filters.search_query.toLowerCase();
          filtered = filtered.filter(
            (d) => d.document_name.toLowerCase().includes(q) || d.original_filename.toLowerCase().includes(q)
          );
        }

        // Sort by created_at DESC
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const total = filtered.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const pagedDocs = filtered.slice(offset, offset + limit);

        return {
          documents: pagedDocs,
          total,
          page,
          limit,
          totalPages,
        };
      }
      throw err;
    }
  }

  /**
   * Fetches latest uploaded documents for a patient.
   */
  public static async getRecentDocuments(patientId: string, limit = 5): Promise<DocumentRecord[]> {
    try {
      const sql = `
        SELECT * FROM public.documents 
        WHERE patient_id = $1 AND is_deleted = FALSE 
        ORDER BY created_at DESC 
        LIMIT $2;
      `;
      const result = await query(sql, [patientId, limit]);
      return result.rows;
    } catch (err: any) {
      if (isConnectionError(err)) {
        logFallbackWarning(err);
        return inMemoryDocuments
          .filter((d) => d.patient_id === patientId && !d.is_deleted)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit);
      }
      throw err;
    }
  }

  /**
   * Updates metadata fields for a specific document.
   */
  public static async updateMetadata(
    id: string,
    updates: Partial<DocumentRecord>
  ): Promise<DocumentRecord | null> {
    try {
      const fields: string[] = [];
      const params: any[] = [id];

      if (updates.document_name !== undefined) {
        params.push(updates.document_name);
        fields.push(`document_name = $${params.length}`);
      }

      if (updates.document_category !== undefined) {
        params.push(updates.document_category);
        fields.push(`document_category = $${params.length}`);
      }

      if (updates.hospital_name !== undefined) {
        params.push(updates.hospital_name);
        fields.push(`hospital_name = $${params.length}`);
      }

      if (updates.doctor_name !== undefined) {
        params.push(updates.doctor_name);
        fields.push(`doctor_name = $${params.length}`);
      }

      if (updates.visit_date !== undefined) {
        params.push(updates.visit_date);
        fields.push(`visit_date = $${params.length}`);
      }

      if (updates.metadata_json !== undefined) {
        params.push(JSON.stringify(updates.metadata_json));
        fields.push(`metadata_json = $${params.length}`);
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      const sql = `
        UPDATE public.documents 
        SET ${fields.join(', ')} 
        WHERE id = $1 AND is_deleted = FALSE 
        RETURNING *;
      `;
      const result = await query(sql, params);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err: any) {
      if (isConnectionError(err)) {
        logFallbackWarning(err);
        const doc = inMemoryDocuments.find((d) => d.id === id && !d.is_deleted);
        if (!doc) return null;

        if (updates.document_name !== undefined) doc.document_name = updates.document_name;
        if (updates.document_category !== undefined) doc.document_category = updates.document_category;
        if (updates.hospital_name !== undefined) doc.hospital_name = updates.hospital_name;
        if (updates.doctor_name !== undefined) doc.doctor_name = updates.doctor_name;
        if (updates.visit_date !== undefined) doc.visit_date = updates.visit_date;
        if (updates.metadata_json !== undefined) doc.metadata_json = updates.metadata_json;
        doc.updated_at = new Date().toISOString();

        return doc;
      }
      throw err;
    }
  }

  /**
   * Soft deletes a document by setting is_deleted = true.
   */
  public static async softDelete(id: string): Promise<boolean> {
    try {
      const sql = `
        UPDATE public.documents 
        SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND is_deleted = FALSE;
      `;
      const result = await query(sql, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (err: any) {
      if (isConnectionError(err)) {
        logFallbackWarning(err);
        const doc = inMemoryDocuments.find((d) => d.id === id && !d.is_deleted);
        if (!doc) return false;
        doc.is_deleted = true;
        doc.updated_at = new Date().toISOString();
        return true;
      }
      throw err;
    }
  }

  /**
   * Records audit event in public.audit_logs.
   */
  public static async createAuditLog(
    userId: string,
    action: string,
    resourceId?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const sql = `
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, ip_address)
        VALUES ($1, $2, 'DOCUMENT', $3, $4);
      `;
      await query(sql, [userId, action, resourceId || null, ipAddress || null]);
    } catch (err: any) {
      if (isConnectionError(err)) {
        // Silently log audit trail warning in fallback mode
        return;
      }
      console.warn('[Audit Log Error]: Failed to write audit log entry', err);
    }
  }
}

