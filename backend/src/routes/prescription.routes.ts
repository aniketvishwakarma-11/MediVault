import { Router, Request, Response, NextFunction } from 'express';
import { PrescriptionController } from '../controllers/prescription.controller';
import { PrescriptionOCRController } from '../controllers/prescription-ocr.controller';
import { handleSingleFileUpload } from '../middleware/upload';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_medivault_chain_ai_2026';

// Optional auth helper: attaches user if token exists, otherwise proceeds
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.decode(token);
      if (decoded && typeof decoded === 'object') {
        (req as any).user = { id: (decoded as any).id || (decoded as any).sub, role: (decoded as any).role || 'patient' };
      }
    } catch {
      // ignore
    }
  }
  next();
};

// 1. Drug Catalog & Search
router.get('/catalog/search', PrescriptionController.searchCatalog);

// 1b. Consented Patients for Doctor (Strict Consent Enforcement)
router.get('/doctor/consented-patients', optionalAuth, PrescriptionController.getConsentedPatients);

// 2. Real-Time AI Safety & Clinical Decision Support (CDS)
router.post('/safety-check', PrescriptionController.checkSafety);

// 3. AI Patient-Friendly Explainer & Multilingual Generator
router.post('/explain', PrescriptionController.explainMedicine);

// 4. Public Scannable Verification & Pharmacy Fulfillment (Zero Auth required for scanner)
router.get('/verify/:id', PrescriptionController.verifyPrescription);
router.post('/:id/dispense', PrescriptionController.dispensePrescription);

// 5. Prescription Management (Doctor Creation & Patient History)
router.post('/', optionalAuth, PrescriptionController.createPrescription);
router.get('/doctor/history', optionalAuth, PrescriptionController.getDoctorHistory);
router.get('/patient/:id', optionalAuth, PrescriptionController.getPatientPrescriptions);
router.post('/:id/cancel', optionalAuth, PrescriptionController.cancelPrescription);
router.delete('/:id', optionalAuth, PrescriptionController.deletePrescription);

// 6. Adherence Schedule & Daily Check-Off
router.get('/adherence/today', optionalAuth, PrescriptionController.getTodayDoses);
router.post('/adherence/log', optionalAuth, PrescriptionController.logAdherence);

// 7. Refill Requests
router.post('/refill/request', optionalAuth, PrescriptionController.requestRefill);

// ══════════════════════════════════════════════════════════════════
// 8. Patient Prescription Intelligence System — Offline Upload Flow
// ══════════════════════════════════════════════════════════════════

// 8a. OCR Service Health (developer/admin)
router.get('/ocr/service-health', PrescriptionOCRController.getOcrServiceHealth);

// 8b. Upload offline prescription image → initiates background OCR job
router.post(
  '/upload-offline',
  optionalAuth,
  handleSingleFileUpload('file'),
  PrescriptionOCRController.uploadOfflinePrescription
);

// 8c. Poll upload job status
router.get('/upload-job/:jobId', optionalAuth, PrescriptionOCRController.getUploadJobStatus);

// 8d. Get full OCR + extraction analysis for patient review screen
router.get('/ocr/:jobId/analysis', optionalAuth, PrescriptionOCRController.getOcrAnalysis);

// 8e. Save patient corrections (before confirming)
router.patch('/ocr/:jobId/review', optionalAuth, PrescriptionOCRController.savePrescriptionReview);

// 8f. Patient confirms verified prescription → saves to history + timeline
router.post('/ocr/:jobId/confirm', optionalAuth, PrescriptionOCRController.confirmPrescription);

// 8g. Get medicine intelligence for a specific drug catalog entry
router.get('/ocr/:jobId/medicine-info/:drugCatalogId', PrescriptionOCRController.getMedicineIntelligence);

// 8h. Get all patient-uploaded (external) prescriptions for a patient (doctor view)
router.get('/patient/:id/external', optionalAuth, PrescriptionOCRController.getExternalPrescriptions);

export default router;
