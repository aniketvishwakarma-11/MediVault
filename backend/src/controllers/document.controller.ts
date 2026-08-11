import { Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { sendSuccess, sendError } from '../utils/response';
import { ALLOWED_CATEGORIES } from '../types/document';
import {
  uploadDocumentSchema,
  updateDocumentMetadataSchema,
  searchDocumentsQuerySchema,
  uuidSchema,
} from '../validators/document.validator';

const getClientIp = (req: Request): string => {
  const rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  return Array.isArray(rawIp) ? rawIp[0] || '127.0.0.1' : String(rawIp);
};

export class DocumentController {
  /**
   * POST /documents/upload
   * Uploads medical document & metadata.
   */
  public static async uploadDocument(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return sendError(res, 400, 'No file payload provided in form-data field "file".');
      }

      // Validate Body Fields with Zod
      const parseResult = uploadDocumentSchema.safeParse(req.body);
      if (!parseResult.success) {
        const fieldErrors = parseResult.error.flatten().fieldErrors;
        const details = Object.entries(fieldErrors)
          .map(([key, msgs]) => `${key}: ${msgs?.join(', ')}`)
          .join(' | ');
        return sendError(
          res,
          400,
          `Validation failed for document metadata: ${details}`,
          fieldErrors
        );
      }

      const input = parseResult.data;

      // Extract Uploader ID & IP Address
      const uploaderId = req.user?.id || input.patient_id;
      const clientIp = getClientIp(req);

      const result = await DocumentService.uploadMedicalDocument(
        req.file,
        {
          ...input,
          uploaded_by: uploaderId,
        },
        clientIp
      );

      if (result.isDuplicate) {
        return sendSuccess(
          res,
          200,
          result.document,
          'Duplicate document detected. Document with matching SHA-256 checksum already exists for this patient.'
        );
      }

      return sendSuccess(res, 201, result.document, 'Medical document uploaded successfully.');
    } catch (error: any) {
      console.error('[DocumentController Upload Error]:', error);
      return sendError(res, 500, error.message || 'Internal server error during document upload.');
    }
  }

  /**
   * GET /documents/:id
   * Fetches single document record with a secure pre-signed download URL.
   */
  public static async getDocumentById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return sendError(res, 400, 'Invalid document ID parameter format.');
      }

      const requesterId = req.user?.id || 'anonymous';
      const clientIp = getClientIp(req);

      const result = await DocumentService.getDocumentById(id as string, requesterId, clientIp);
      if (!result) {
        return sendError(res, 404, 'Medical document not found or has been deleted.');
      }

      return sendSuccess(res, 200, result, 'Document fetched successfully.');
    } catch (error: any) {
      console.error('[DocumentController GetById Error]:', error);
      return sendError(res, 500, error.message || 'Internal server error while fetching document.');
    }
  }

  /**
   * GET /documents/:id/file
   * Streams raw document object directly from MinIO to the browser.
   */
  public static async streamDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await DocumentService.streamDocumentFile(id as string);
      if (!result) {
        res.status(404).send('Document file not found.');
        return;
      }

      res.setHeader('Content-Type', result.document.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${result.document.original_filename}"`);
      result.stream.pipe(res);
    } catch (error: any) {
      console.error('[DocumentController Stream Error]:', error);
      res.status(500).send('Failed to stream document file.');
    }
  }

  /**
   * POST /documents/:id/analyze
   * Triggers on-demand AI Medical Intelligence analysis / re-analysis.
   */
  public static async analyzeDocument(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const aiAnalysis = await DocumentService.analyzeDocumentOnDemand(id as string);
      if (!aiAnalysis) {
        return sendError(res, 404, 'Document not found for AI analysis.');
      }
      return sendSuccess(res, 200, aiAnalysis, 'AI Medical Intelligence Analysis generated successfully.');
    } catch (error: any) {
      console.error('[DocumentController Analyze Error]:', error);
      return sendError(res, 500, error.message || 'Failed to generate AI document analysis.');
    }
  }

  /**
   * GET /documents/search
   * GET /documents
   * Search & filter documents with pagination support.
   */
  public static async searchDocuments(req: Request, res: Response): Promise<Response> {
    try {
      const parseResult = searchDocumentsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return sendError(
          res,
          400,
          'Invalid search query parameters.',
          parseResult.error.flatten().fieldErrors
        );
      }

      const queryFilters = parseResult.data;

      // If logged in as patient and patient_id is omitted, default to user's patient_id
      if (req.user?.role === 'patient' && !queryFilters.patient_id && req.user.patient_id) {
        queryFilters.patient_id = String(req.user.patient_id);
      }

      const result = await DocumentService.searchDocuments(queryFilters);
      return sendSuccess(
        res,
        200,
        result.documents,
        'Documents retrieved successfully.',
        {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      );
    } catch (error: any) {
      console.error('[DocumentController Search Error]:', error);
      return sendError(res, 500, error.message || 'Internal server error while searching documents.');
    }
  }

  /**
   * GET /documents/recent
   * Retrieves latest documents for authenticated user.
   */
  public static async getRecentDocuments(req: Request, res: Response): Promise<Response> {
    try {
      const patientId = req.user?.patient_id || (typeof req.query.patient_id === 'string' ? req.query.patient_id : undefined);
      if (!patientId) {
        return sendError(res, 400, 'Patient ID is required to fetch recent documents.');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const documents = await DocumentService.getRecentDocuments(patientId, limit);

      return sendSuccess(res, 200, documents, 'Recent documents retrieved successfully.');
    } catch (error: any) {
      console.error('[DocumentController Recent Error]:', error);
      return sendError(res, 500, error.message || 'Internal server error while fetching recent documents.');
    }
  }

  /**
   * GET /documents/patient/:patientId
   * Retrieves documents for specific patient.
   */
  public static async getPatientDocuments(req: Request, res: Response): Promise<Response> {
    try {
      const { patientId } = req.params;
      const idValidation = uuidSchema.safeParse(patientId);
      if (!idValidation.success) {
        return sendError(res, 400, 'Invalid patient ID format.');
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await DocumentService.searchDocuments({
        patient_id: patientId as string,
        page,
        limit,
      });

      return sendSuccess(
        res,
        200,
        result.documents,
        'Patient documents retrieved successfully.',
        {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        }
      );
    } catch (error: any) {
      console.error('[DocumentController PatientDocuments Error]:', error);
      return sendError(res, 500, error.message || 'Internal server error while fetching patient documents.');
    }
  }

  /**
   * GET /documents/categories
   * Returns list of supported medical document categories.
   */
  public static getCategories(req: Request, res: Response): Response {
    return sendSuccess(
      res,
      200,
      { categories: ALLOWED_CATEGORIES },
      'Supported medical document categories retrieved successfully.'
    );
  }

  /**
   * PATCH /documents/:id
   * Updates metadata for an existing document.
   */
  public static async updateDocument(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return sendError(res, 400, 'Invalid document ID format.');
      }

      const parseResult = updateDocumentMetadataSchema.safeParse(req.body);
      if (!parseResult.success) {
        return sendError(
          res,
          400,
          'Validation failed for metadata updates.',
          parseResult.error.flatten().fieldErrors
        );
      }

      const requesterId = req.user?.id || 'anonymous';
      const clientIp = getClientIp(req);

      const updated = await DocumentService.updateDocumentMetadata(
        id as string,
        parseResult.data,
        requesterId,
        clientIp
      );

      if (!updated) {
        return sendError(res, 404, 'Document not found or soft-deleted.');
      }

      return sendSuccess(res, 200, updated, 'Document metadata updated successfully.');
    } catch (error: any) {
      console.error('[DocumentController Update Error]:', error);
      return sendError(res, 500, error.message || 'Internal server error while updating metadata.');
    }
  }

  /**
   * DELETE /documents/:id
   * Soft-deletes a document.
   */
  public static async deleteDocument(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return sendError(res, 400, 'Invalid document ID format.');
      }

      const requesterId = req.user?.id || 'anonymous';
      const clientIp = getClientIp(req);

      const deleted = await DocumentService.softDeleteDocument(id as string, requesterId, clientIp);
      if (!deleted) {
        return sendError(res, 404, 'Document not found or already deleted.');
      }

      return sendSuccess(res, 200, null, 'Document soft deleted successfully.');
    } catch (error: any) {
      console.error('[DocumentController Delete Error]:', error);
      return sendError(res, 500, error.message || 'Internal server error while deleting document.');
    }
  }
}
