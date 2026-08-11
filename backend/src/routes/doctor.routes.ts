import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Apply auth middleware to doctor routes
router.use(authenticateJWT);

// Doctor Profile
router.get('/profile', DoctorController.getProfile);

// Patient Search
router.get('/patients/search', DoctorController.searchPatients);

// Consent Request
router.post('/patients/request-access', DoctorController.requestAccess);

// Emergency Access
router.post('/emergency/access', DoctorController.emergencyAccess);

// Consultations & Prescriptions
router.post('/consultations', DoctorController.createConsultation);
router.post('/prescriptions', DoctorController.createPrescription);

// Doctor AI Copilot Query
router.post('/copilot/query', DoctorController.queryCopilot);

export default router;
