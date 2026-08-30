import { Router, Request, Response, NextFunction } from 'express';
import {
  DatabaseUnavailableError,
  AIProcessingError,
  ResourceNotFoundError,
  ClinicalSafetyError,
  ValidationError,
  UnauthorizedAccessError,
} from '../errors/AppError';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Diagnostic & Error Simulation Sandbox Router
 * Used by Administrators to test user-facing clinical error presentation end-to-end.
 */
router.post('/simulate-error', (req: Request, res: Response, next: NextFunction) => {
  const { errorType } = req.body;
  logger.info(`[Admin Diagnostic]: Simulating error type "${errorType}"`);

  try {
    switch (errorType) {
      case 'DATABASE_OUTAGE':
        throw new DatabaseUnavailableError(
          'Simulated PostgreSQL connection pool exhaustion (ECONNREFUSED :5432)',
          'Please verify database connection status. The system prevented any uncommitted writes.'
        );

      case 'AI_INFERENCE_TIMEOUT':
        throw new AIProcessingError(
          'AI_INFERENCE_TIMEOUT',
          'Google Gemini 1.5 Flash inference timed out after 30,000ms',
          'Our automated medical analysis engine is currently experiencing high traffic and could not safely extract clinical values. Your original document is safely preserved.',
          'You can view the original document anytime, or re-run analysis in a few minutes.'
        );

      case 'PRESCRIPTION_NOT_FOUND':
        throw new ResourceNotFoundError(
          'Prescription',
          'RX-FAKE-992140',
          'This digital prescription code does not exist in the MediVault National Registry or has been revoked.',
          'Do not dispense medication based on this QR code. Contact the prescribing physician or clinic desk.'
        );

      case 'UNVERIFIED_DOCTOR_LICENSE':
        throw new ClinicalSafetyError(
          'PRESCRIBING_DOCTOR_UNVERIFIED',
          'Physician license status is PENDING_VERIFICATION or rejected',
          'Physician Authorization Required',
          'Your account credentials do not have an active, verified medical license on file with the State Medical Council.',
          'Please complete your physician credentialing in Doctor Settings before issuing digital prescriptions.'
        );

      case 'PATIENT_SESSION_MISMATCH':
        throw new ValidationError(
          'PATIENT_ID_REQUIRED',
          'Authenticated patient identity could not be established from session token',
          'Patient Session Identifier Required',
          'To protect patient privacy and comply with health confidentiality laws, access to this medical record requires an authenticated patient profile.',
          'Please refresh your session or sign in again to reconnect to your personal health vault.'
        );

      case 'UNAUTHORIZED_ACCESS':
        throw new UnauthorizedAccessError(
          'Actor lacks role "doctor" or "admin"',
          'Clinical Authorization Notice',
          'You do not have clinical clearance to access or modify this patient medical record.',
          'Please sign into your verified medical staff account.'
        );

      case 'UNHANDLED_SYSTEM_CRASH':
        // Deliberately throw an unhandled internal error with sensitive text to verify sanitization
        throw new Error('FATAL: relation "public.patient_phi_internal" query deadlock on worker thread 0x4892');

      default:
        return sendSuccess(res, 200, {
          availableTypes: [
            'DATABASE_OUTAGE',
            'AI_INFERENCE_TIMEOUT',
            'PRESCRIPTION_NOT_FOUND',
            'UNVERIFIED_DOCTOR_LICENSE',
            'PATIENT_SESSION_MISMATCH',
            'UNAUTHORIZED_ACCESS',
            'UNHANDLED_SYSTEM_CRASH',
          ],
          message: 'Specify "errorType" in request body to simulate an error.',
        });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
