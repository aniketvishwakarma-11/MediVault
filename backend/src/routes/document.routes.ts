import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { handleSingleFileUpload } from '../middleware/upload';
import { authenticateJWT, validatePatientAccess } from '../middleware/auth';
import { uploadRateLimiter, apiRateLimiter } from '../middleware/security';

const router = Router();

/**
 * @route   GET /documents/categories
 * @desc    Fetch supported medical document categories
 * @access  Public / Authenticated
 */
router.get('/categories', apiRateLimiter, DocumentController.getCategories);

/**
 * @route   POST /documents/upload
 * @desc    Upload a medical document with metadata
 * @access  Authenticated (Patient / Doctor / Hospital)
 */
router.post(
  '/upload',
  uploadRateLimiter,
  authenticateJWT,
  handleSingleFileUpload('file'),
  DocumentController.uploadDocument
);

/**
 * @route   GET /documents/search
 * @desc    Advanced search and filtering of documents
 * @access  Authenticated
 */
router.get('/search', apiRateLimiter, authenticateJWT, DocumentController.searchDocuments);

/**
 * @route   GET /documents/recent
 * @desc    Fetch latest documents for logged-in user or patient
 * @access  Authenticated
 */
router.get('/recent', apiRateLimiter, authenticateJWT, DocumentController.getRecentDocuments);

/**
 * @route   GET /documents/patient/:patientId
 * @desc    Fetch all documents for specific patient ID
 * @access  Authenticated (Patient owner / Authorized provider with consent)
 */
router.get(
  '/patient/:patientId',
  apiRateLimiter,
  authenticateJWT,
  validatePatientAccess,
  DocumentController.getPatientDocuments
);

/**
 * @route   GET /documents
 * @desc    List patient documents (paginated/filtered)
 * @access  Authenticated
 */
router.get('/', apiRateLimiter, authenticateJWT, DocumentController.searchDocuments);

/**
 * @route   GET /documents/:id
 * @desc    Fetch single document metadata and pre-signed download URL
 * @access  Authenticated
 */
router.get('/:id', apiRateLimiter, authenticateJWT, DocumentController.getDocumentById);

/**
 * @route   PATCH /documents/:id
 * @desc    Update metadata for an existing document
 * @access  Authenticated
 */
router.patch('/:id', apiRateLimiter, authenticateJWT, DocumentController.updateDocument);

/**
 * @route   DELETE /documents/:id
 * @desc    Soft-delete a document
 * @access  Authenticated
 */
router.delete('/:id', apiRateLimiter, authenticateJWT, DocumentController.deleteDocument);

export default router;
