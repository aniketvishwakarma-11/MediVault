import { Router } from 'express';
import { EmergencyController } from '../controllers/emergency.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// ─────────────────────────────────────────────────────────────────
// PUBLIC — No authentication required
// Anyone who scans a QR code can access these.
// ─────────────────────────────────────────────────────────────────

// Resolve a QR credential and return Level 0 public emergency profile
router.get('/:credential', EmergencyController.resolvePublic);

// ─────────────────────────────────────────────────────────────────
// PATIENT — Requires JWT auth + patient role
// ─────────────────────────────────────────────────────────────────

// Generate first credential (or after revoke)
router.post(
  '/credential',
  authenticateJWT,
  authorizeRoles('patient'),
  EmergencyController.generateCredential
);

// Get current credential status
router.get(
  '/credential/status',
  authenticateJWT,
  authorizeRoles('patient'),
  EmergencyController.getCredential
);

// Regenerate credential (revokes old one automatically)
router.post(
  '/credential/regenerate',
  authenticateJWT,
  authorizeRoles('patient'),
  EmergencyController.regenerateCredential
);

// Revoke active credential
router.post(
  '/credential/revoke',
  authenticateJWT,
  authorizeRoles('patient'),
  EmergencyController.revokeCredential
);

// Get emergency profile settings
router.get(
  '/profile/settings',
  authenticateJWT,
  authorizeRoles('patient'),
  EmergencyController.getProfileSettings
);

// Update emergency profile settings
router.patch(
  '/profile/settings',
  authenticateJWT,
  authorizeRoles('patient'),
  EmergencyController.updateProfileSettings
);

// Get access history
router.get(
  '/access-history',
  authenticateJWT,
  authorizeRoles('patient'),
  EmergencyController.getAccessHistory
);

// Patient can also revoke an active session on their record
router.post(
  '/session/:id/revoke',
  authenticateJWT,
  EmergencyController.revokeSession
);

// ─────────────────────────────────────────────────────────────────
// DOCTOR — Requires JWT auth + doctor role
// ─────────────────────────────────────────────────────────────────

// Break-glass emergency access
router.post(
  '/access',
  authenticateJWT,
  authorizeRoles('doctor'),
  EmergencyController.breakGlassAccess
);

export default router;
