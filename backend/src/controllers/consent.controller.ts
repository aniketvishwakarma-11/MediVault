import { Request, Response } from 'express';
import { ConsentService } from '../services/consent.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import type { ConsentScope } from '../types/consent';

/**
 * MediVault Consent Controller
 *
 * Handles HTTP layer for both doctor-facing and patient-facing
 * consent endpoints. All authorization decisions are delegated
 * to ConsentService — this layer only validates input and maps HTTP.
 */
export class ConsentController {

  // ═══════════════════════════════════════════════════════════
  // DOCTOR-FACING ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /doctor/patients/search-consent
   * Authenticated patient search with per-patient consent status.
   */
  public static async searchPatients(req: Request, res: Response): Promise<void> {
    try {
      const doctorUserId = req.user?.id;
      if (!doctorUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }

      const q = (req.query.q as string) || '';
      const bloodGroup = req.query.bloodGroup as string | undefined;
      const gender = req.query.gender as string | undefined;
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

      const result = await ConsentService.searchPatients(
        doctorUserId,
        q,
        { bloodGroup, gender },
        page,
        limit
      );

      sendSuccess(
        res,
        200,
        result.patients,
        'Patient search results',
        { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
      );
    } catch (err: any) {
      logger.error('[ConsentController.searchPatients]', err);
      sendError(res, 500, 'Patient search failed. Please try again.');
    }
  }

  /**
   * GET /doctor/patients/:patientId/profile
   * Minimal patient identity. Protected fields gated behind consent.
   */
  public static async getPatientProfile(req: Request, res: Response): Promise<void> {
    try {
      const doctorUserId = req.user?.id;
      const patientId = req.params.patientId as string;

      if (!doctorUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }
      if (!patientId) {
        sendError(res, 400, 'Patient ID is required.');
        return;
      }

      const profile = await ConsentService.getMinimalProfile(doctorUserId, patientId);
      if (!profile) {
        sendError(res, 404, 'Patient not found.');
        return;
      }

      sendSuccess(res, 200, profile, 'Patient profile retrieved');
    } catch (err: any) {
      logger.error('[ConsentController.getPatientProfile]', err);
      sendError(res, 500, 'Failed to retrieve patient profile.');
    }
  }

  /**
   * GET /doctor/patients/:patientId/consent
   * Consent status for the requesting doctor ↔ patient pair.
   */
  public static async getConsentStatus(req: Request, res: Response): Promise<void> {
    try {
      const doctorUserId = req.user?.id;
      const patientId = req.params.patientId as string;

      if (!doctorUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }

      const status = await ConsentService.getConsentStatus(doctorUserId, patientId);
      sendSuccess(res, 200, status, 'Consent status resolved');
    } catch (err: any) {
      logger.error('[ConsentController.getConsentStatus]', err);
      sendError(res, 500, 'Failed to resolve consent status.');
    }
  }

  /**
   * POST /doctor/patients/:patientId/request-access
   * Doctor submits an access request to patient.
   * Body: { purpose, scope?, durationDays? }
   */
  public static async requestAccess(req: Request, res: Response): Promise<void> {
    try {
      const doctorUserId = req.user?.id;
      const patientId = req.params.patientId as string;

      if (!doctorUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }
      if (!patientId) {
        sendError(res, 400, 'Patient ID is required.');
        return;
      }

      const { purpose, scope, durationDays } = req.body;
      if (!purpose?.trim()) {
        sendError(res, 400, 'A clinical purpose / medical justification is required.');
        return;
      }

      // Mass assignment protection — ignore any status/approved fields from client
      const safeScope = (['Full Vault', 'Lab Reports Only', 'Emergency Only', 'Timeline Only'].includes(scope)
        ? scope
        : 'Full Vault') as ConsentScope;

      const safeDuration = Math.min(365, Math.max(1, parseInt(durationDays || '30', 10)));

      // Get doctor name for notification
      const doctorName = req.user?.email
        ? `Dr. ${req.user.email.split('@')[0]}`
        : 'Unknown Doctor';

      const grant = await ConsentService.createAccessRequest(
        doctorUserId,
        patientId,
        purpose,
        safeScope,
        safeDuration,
        doctorName
      );

      sendSuccess(res, 201, grant, 'Access request sent to patient successfully.');
    } catch (err: any) {
      logger.error('[ConsentController.requestAccess]', err);
      if (err.message?.includes('already exists')) {
        sendError(res, 409, err.message);
      } else {
        sendError(res, 500, err.message || 'Failed to submit access request.');
      }
    }
  }

  /**
   * GET /doctor/consent-requests
   * List doctor's own consent requests (all statuses).
   */
  public static async getDoctorRequests(req: Request, res: Response): Promise<void> {
    try {
      const doctorUserId = req.user?.id;
      if (!doctorUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }

      const grants = await ConsentService.getDoctorConsentRequests(doctorUserId);
      sendSuccess(res, 200, grants, 'Doctor consent requests retrieved');
    } catch (err: any) {
      logger.error('[ConsentController.getDoctorRequests]', err);
      sendError(res, 500, 'Failed to retrieve consent requests.');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATIENT-FACING ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /patient/consent/pending
   * Patient sees incoming pending consent requests.
   */
  public static async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const patientUserId = req.user?.id;
      if (!patientUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }

      const requests = await ConsentService.getPendingRequestsForPatient(patientUserId);
      sendSuccess(res, 200, requests, 'Pending consent requests retrieved');
    } catch (err: any) {
      logger.error('[ConsentController.getPendingRequests]', err);
      sendError(res, 500, 'Failed to retrieve pending requests.');
    }
  }

  /**
   * GET /patient/consent/grants
   * Patient sees all their consent grants (active, expired, revoked).
   */
  public static async getAllGrants(req: Request, res: Response): Promise<void> {
    try {
      const patientUserId = req.user?.id;
      if (!patientUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }

      const grants = await ConsentService.getAllGrantsForPatient(patientUserId);
      sendSuccess(res, 200, grants, 'Consent grants retrieved');
    } catch (err: any) {
      logger.error('[ConsentController.getAllGrants]', err);
      sendError(res, 500, 'Failed to retrieve consent grants.');
    }
  }

  /**
   * POST /patient/consent/:consentId/approve
   * Patient approves a pending consent request.
   * Generates consent hash + blockchain simulation tx.
   */
  public static async approveRequest(req: Request, res: Response): Promise<void> {
    try {
      const patientUserId = req.user?.id;
      const consentId = req.params.consentId as string;

      if (!patientUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }

      const grant = await ConsentService.approveConsentRequest(patientUserId, consentId);
      sendSuccess(res, 200, grant, 'Access approved. Cryptographic authorization issued.');
    } catch (err: any) {
      logger.error('[ConsentController.approveRequest]', err);
      if (err.message?.includes('not found') || err.message?.includes('permission')) {
        sendError(res, 403, err.message);
      } else {
        sendError(res, 500, err.message || 'Failed to approve consent request.');
      }
    }
  }

  /**
   * POST /patient/consent/:consentId/deny
   * Patient denies a pending consent request.
   */
  public static async denyRequest(req: Request, res: Response): Promise<void> {
    try {
      const patientUserId = req.user?.id;
      const consentId = req.params.consentId as string;

      if (!patientUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }

      const grant = await ConsentService.denyConsentRequest(patientUserId, consentId);
      sendSuccess(res, 200, grant, 'Consent request denied.');
    } catch (err: any) {
      logger.error('[ConsentController.denyRequest]', err);
      sendError(res, err.message?.includes('not found') ? 403 : 500, err.message || 'Failed to deny request.');
    }
  }

  /**
   * POST /patient/consent/:consentId/revoke
   * Patient revokes an active consent grant.
   */
  public static async revokeGrant(req: Request, res: Response): Promise<void> {
    try {
      const patientUserId = req.user?.id;
      const consentId = req.params.consentId as string;

      if (!patientUserId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }

      const grant = await ConsentService.revokeConsent(patientUserId, consentId);
      sendSuccess(res, 200, grant, 'Consent revoked. Doctor access immediately terminated.');
    } catch (err: any) {
      logger.error('[ConsentController.revokeGrant]', err);
      sendError(res, err.message?.includes('not found') ? 403 : 500, err.message || 'Failed to revoke consent.');
    }
  }

  /**
   * GET /consent/:consentId/verify
   * Verify cryptographic integrity of a consent hash.
   */
  public static async verifyConsent(req: Request, res: Response): Promise<void> {
    try {
      const consentId = req.params.consentId as string;
      const result = await ConsentService.verifyConsentHash(consentId);
      sendSuccess(res, 200, result, result.message);
    } catch (err: any) {
      logger.error('[ConsentController.verifyConsent]', err);
      sendError(res, 500, 'Consent verification failed.');
    }
  }
}
