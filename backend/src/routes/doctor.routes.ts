import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Apply auth middleware to doctor routes
router.use(authenticateJWT);

// Doctor Profile
router.get('/profile', DoctorController.getProfile);
router.put('/profile', DoctorController.updateProfile);

// Dashboard Live Statistics
router.get('/dashboard/stats', DoctorController.getDashboardStats);

// Patients Directory & Search
router.get('/patients', DoctorController.getPatients);
router.get('/patients/search', DoctorController.searchPatients);
router.get('/patients/:id', DoctorController.getPatientById);
router.get('/patients/:id/reports', DoctorController.getPatientReports);

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
