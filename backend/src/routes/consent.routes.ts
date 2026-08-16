import { Router } from 'express';
import { ConsentController } from '../controllers/consent.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// ─── All routes require authentication ────────────────────────────────────────
router.use(authenticateJWT);

// ─── Doctor-facing routes ─────────────────────────────────────────────────────
// Patient search (with consent status overlay)
router.get(
  '/doctor/patients/search',
  authorizeRoles('doctor', 'hospital'),
  ConsentController.searchPatients
);

// Minimal patient profile (protected fields gated behind consent)
router.get(
  '/doctor/patients/:patientId/profile',
  authorizeRoles('doctor', 'hospital'),
  ConsentController.getPatientProfile
);

// Consent status for doctor ↔ patient pair
router.get(
  '/doctor/patients/:patientId/consent',
  authorizeRoles('doctor', 'hospital'),
  ConsentController.getConsentStatus
);

// Doctor submits access request to patient
router.post(
  '/doctor/patients/:patientId/request-access',
  authorizeRoles('doctor', 'hospital'),
  ConsentController.requestAccess
);

// Doctor views their own consent requests
router.get(
  '/doctor/consent-requests',
  authorizeRoles('doctor', 'hospital'),
  ConsentController.getDoctorRequests
);

// ─── Patient-facing routes ────────────────────────────────────────────────────
// Patient views pending consent requests
router.get(
  '/patient/consent/pending',
  authorizeRoles('patient', 'doctor', 'hospital'),
  ConsentController.getPendingRequests
);

// Patient views all consent grants
router.get(
  '/patient/consent/grants',
  authorizeRoles('patient', 'doctor', 'hospital'),
  ConsentController.getAllGrants
);

// Patient approves a consent request
router.post(
  '/patient/consent/:consentId/approve',
  authorizeRoles('patient', 'doctor', 'hospital'),
  ConsentController.approveRequest
);

// Patient denies a consent request
router.post(
  '/patient/consent/:consentId/deny',
  authorizeRoles('patient', 'doctor', 'hospital'),
  ConsentController.denyRequest
);

// Patient revokes an active consent grant
router.post(
  '/patient/consent/:consentId/revoke',
  authorizeRoles('patient', 'doctor', 'hospital'),
  ConsentController.revokeGrant
);


// ─── Shared — cryptographic verification ─────────────────────────────────────
router.get(
  '/consent/:consentId/verify',
  ConsentController.verifyConsent
);

export default router;
