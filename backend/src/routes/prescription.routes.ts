import { Router } from 'express';
import { PrescriptionController } from '../controllers/prescription.controller';
import { PrescriptionOCRController } from '../controllers/prescription-ocr.controller';
import { handleSingleFileUpload } from '../middleware/upload';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// 1. Drug Catalog & Search
router.get('/catalog/search', PrescriptionController.searchCatalog);

// 1b. Consented Patients for Doctor (Strict Doctor Role Enforcement)
router.get(
  '/doctor/consented-patients',
  authenticateJWT,
  authorizeRoles('doctor', 'admin'),
  PrescriptionController.getConsentedPatients
);

// 2. Real-Time AI Safety & Clinical Decision Support (CDS)
router.post('/safety-check', authenticateJWT, PrescriptionController.checkSafety);

// 3. AI Patient-Friendly Explainer & Multilingual Generator
router.post('/explain', authenticateJWT, PrescriptionController.explainMedicine);

// 4. Public Scannable Verification & Pharmacy Fulfillment
router.get('/verify/:id', PrescriptionController.verifyPrescription);
router.post('/:id/dispense', PrescriptionController.dispensePrescription);

// 5. Prescription Management (Doctor Creation & Patient History)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('doctor', 'admin'),
  PrescriptionController.createPrescription
);
router.get(
  '/doctor/history',
  authenticateJWT,
  authorizeRoles('doctor', 'admin'),
  PrescriptionController.getDoctorHistory
);
router.get('/patient/:id', authenticateJWT, PrescriptionController.getPatientPrescriptions);
router.post(
  '/:id/cancel',
  authenticateJWT,
  authorizeRoles('doctor', 'admin'),
  PrescriptionController.cancelPrescription
);
// Hard deletion strictly restricted to admin audit operations
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  PrescriptionController.deletePrescription
);

// 6. Adherence Schedule & Daily Check-Off
router.get('/adherence/today', authenticateJWT, PrescriptionController.getTodayDoses);
router.post('/adherence/log', authenticateJWT, PrescriptionController.logAdherence);

// 7. Refill Requests
router.post('/refill/request', authenticateJWT, PrescriptionController.requestRefill);
router.get(
  '/refill/queue',
  authenticateJWT,
  authorizeRoles('doctor', 'admin'),
  PrescriptionController.getRefillQueue
);
router.post(
  '/refill/:id/approve',
  authenticateJWT,
  authorizeRoles('doctor', 'admin'),
  PrescriptionController.approveRefill
);

// ══════════════════════════════════════════════════════════════════
// 8. Patient Prescription Intelligence System — Offline Upload Flow
// ══════════════════════════════════════════════════════════════════

// 8a. OCR Service Health (developer/admin)
router.get('/ocr/service-health', PrescriptionOCRController.getOcrServiceHealth);

// 8b. Upload offline prescription image → initiates background OCR job
router.post(
  '/upload-offline',
  authenticateJWT,
  handleSingleFileUpload('file'),
  PrescriptionOCRController.uploadOfflinePrescription
);

// 8c. Poll upload job status
router.get('/upload-job/:jobId', authenticateJWT, PrescriptionOCRController.getUploadJobStatus);

// 8d. Get full OCR + extraction analysis for patient review screen
router.get('/ocr/:jobId/analysis', authenticateJWT, PrescriptionOCRController.getOcrAnalysis);

// 8e. Save patient corrections (before confirming)
router.patch('/ocr/:jobId/review', authenticateJWT, PrescriptionOCRController.savePrescriptionReview);

// 8f. Patient confirms verified prescription → saves to history + timeline
router.post('/ocr/:jobId/confirm', authenticateJWT, PrescriptionOCRController.confirmPrescription);

// 8g. Get medicine intelligence for a specific drug catalog entry
router.get(
  '/ocr/:jobId/medicine-info/:drugCatalogId',
  authenticateJWT,
  PrescriptionOCRController.getMedicineIntelligence
);

// 8h. Get all patient-uploaded (external) prescriptions for a patient
router.get('/patient/:id/external', authenticateJWT, PrescriptionOCRController.getExternalPrescriptions);

export default router;
