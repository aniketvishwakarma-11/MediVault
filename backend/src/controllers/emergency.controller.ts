import { Request, Response } from 'express';
import { EmergencyService } from '../services/emergency.service';
import { DoctorService } from '../services/doctor.service';
import { query } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import type { BreakGlassReasonCode } from '../types/emergency';

const VALID_REASON_CODES: BreakGlassReasonCode[] = [
  'PATIENT_UNCONSCIOUS',
  'PATIENT_UNABLE_TO_CONSENT',
  'LIFE_THREATENING_EMERGENCY',
  'UNKNOWN_MEDICAL_HISTORY',
  'ALLERGY_VERIFICATION',
  'MEDICATION_VERIFICATION',
  'OTHER',
];

const VALID_SCOPES = [
  'emergency.profile',
  'clinical.summary',
  'medications.read',
  'labs.read',
  'documents.read',
  'timeline.read',
];

export class EmergencyController {

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC — No authentication required
  // ─────────────────────────────────────────────────────────────────

  /**
   * GET /emergency/:credential
   * Resolve a QR credential and return public emergency profile.
   */
  public static async resolvePublic(req: Request, res: Response): Promise<void> {
    const { credential } = req.params;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

    if (!credential || typeof credential !== 'string' || credential.length < 16) {
      sendError(res, 400, 'Invalid emergency credential format.');
      return;
    }

    try {
      const resolved = await EmergencyService.resolveCredential(credential);

      if (!resolved || resolved.errorCode) {
        const codeMap: Record<string, string> = {
          INVALID: 'This emergency credential is not recognized. The QR code may be damaged or invalid.',
          EXPIRED: 'This emergency credential has expired. Ask the patient to generate a new Emergency Pass.',
          REVOKED: 'This emergency credential has been revoked. Ask the patient to generate a new Emergency Pass.',
          SUSPENDED: 'This emergency credential is temporarily suspended.',
        };
        const errorCode = resolved?.errorCode || 'INVALID';
        sendError(res, 404, codeMap[errorCode] || 'Invalid credential.');

        // Log the failed attempt (non-blocking)
        if (resolved?.patientId) {
          EmergencyService.logEvent({
            patientId: resolved.patientId,
            actorType: 'PUBLIC',
            action: `CREDENTIAL_${errorCode}` as any,
            ipAddress,
          }).catch(() => {});
        }
        return;
      }

      // Rate limiting check
      const rateCheck = await EmergencyService.checkScanRateLimit(resolved.credentialId, ipAddress);
      if (!rateCheck.allowed) {
        // Log suspicious activity
        EmergencyService.logEvent({
          patientId: resolved.patientId,
          actorType: 'PUBLIC',
          action: 'SUSPICIOUS_ACTIVITY',
          ipAddress,
          metadata: { scanCount: rateCheck.scanCount },
        }).catch(() => {});
        sendError(res, 429, 'Too many requests for this credential. Please try again later.');
        return;
      }

      // Log scan event
      EmergencyService.logEvent({
        patientId: resolved.patientId,
        actorType: 'PUBLIC',
        action: 'QR_SCANNED',
        ipAddress,
        metadata: { credentialId: resolved.credentialId },
      }).catch(() => {});

      // Load public emergency profile
      const profile = await EmergencyService.getPublicProfile(resolved.patientId, resolved.credentialId);
      if (!profile) {
        sendError(res, 503, 'Emergency profile is temporarily unavailable. Please contact emergency services directly.');
        return;
      }

      // Log profile viewed
      EmergencyService.logEvent({
        patientId: resolved.patientId,
        actorType: 'PUBLIC',
        action: 'EMERGENCY_PROFILE_VIEWED',
        ipAddress,
        metadata: { credentialId: resolved.credentialId },
      }).catch(() => {});

      sendSuccess(res, 200, {
        credentialId: resolved.credentialId,
        profile,
      }, 'Emergency profile loaded.');
    } catch (err: any) {
      logger.error('[EmergencyController.resolvePublic]', err);
      // Never expose internal errors on the public emergency endpoint
      sendError(res, 503, 'Emergency system is temporarily unavailable. Please contact emergency services directly.');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PATIENT — Requires JWT auth + patient role
  // ─────────────────────────────────────────────────────────────────

  /**
   * POST /emergency/credential
   * Generate (or first-time create) an emergency credential.
   */
  public static async generateCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const patientId = user?.patient_id || user?.id || 'demo-patient-123';
      if (!patientId) { sendError(res, 401, 'Patient identity not found.'); return; }

      const generated = await EmergencyService.generateCredential(patientId);
      sendSuccess(res, 201, generated, 'Emergency credential generated. Save the QR code — the raw token is only shown once.');
    } catch (err: any) {
      logger.error('[EmergencyController.generateCredential]', err);
      sendError(res, 500, err.message || 'Failed to generate emergency credential.');
    }
  }

  /**
   * GET /emergency/credential
   * Get current credential status (no raw token).
   */
  public static async getCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const patientId = user?.patient_id || user?.id || 'demo-patient-123';
      if (!patientId) { sendError(res, 401, 'Patient identity not found.'); return; }

      const credential = await EmergencyService.getCredential(patientId);
      sendSuccess(res, 200, credential, credential ? 'Active credential found.' : 'No active credential.');
    } catch (err: any) {
      logger.error('[EmergencyController.getCredential]', err);
      sendError(res, 500, err.message || 'Failed to fetch credential.');
    }
  }

  /**
   * POST /emergency/credential/regenerate
   * Revoke old credential and generate a new one.
   */
  public static async regenerateCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const patientId = user?.patient_id || user?.id || 'demo-patient-123';
      if (!patientId) { sendError(res, 401, 'Patient identity not found.'); return; }

      const generated = await EmergencyService.regenerateCredential(patientId);
      sendSuccess(res, 201, generated, 'New emergency credential generated. Previous QR code is now invalid.');
    } catch (err: any) {
      logger.error('[EmergencyController.regenerateCredential]', err);
      sendError(res, 500, err.message || 'Failed to regenerate credential.');
    }
  }

  /**
   * POST /emergency/credential/revoke
   * Revoke the active credential.
   */
  public static async revokeCredential(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const patientId = user?.patient_id || user?.id || 'demo-patient-123';
      if (!patientId) { sendError(res, 401, 'Patient identity not found.'); return; }

      await EmergencyService.revokeCredential(patientId, user.id);
      sendSuccess(res, 200, null, 'Emergency credential revoked. All QR codes using this credential are now invalid.');
    } catch (err: any) {
      logger.error('[EmergencyController.revokeCredential]', err);
      sendError(res, 500, err.message || 'Failed to revoke credential.');
    }
  }

  /**
   * GET /emergency/access-history
   * Get patient's emergency access event history.
   */
  public static async getAccessHistory(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const patientId = user?.patient_id || user?.id || 'demo-patient-123';
      if (!patientId) { sendError(res, 401, 'Patient identity not found.'); return; }

      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
      const history = await EmergencyService.getAccessHistory(patientId, limit);
      sendSuccess(res, 200, history, 'Emergency access history retrieved.');
    } catch (err: any) {
      logger.error('[EmergencyController.getAccessHistory]', err);
      sendError(res, 500, err.message || 'Failed to fetch access history.');
    }
  }

  /**
   * GET /emergency/profile
   * Get the patient's emergency profile settings.
   */
  public static async getProfileSettings(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const patientId = user?.patient_id || user?.id || 'demo-patient-123';
      if (!patientId) { sendError(res, 401, 'Patient identity not found.'); return; }

      const profile = await EmergencyService.getProfileSettings(patientId);
      sendSuccess(res, 200, profile, 'Emergency profile settings retrieved.');
    } catch (err: any) {
      logger.error('[EmergencyController.getProfileSettings]', err);
      sendError(res, 500, err.message || 'Failed to fetch emergency profile settings.');
    }
  }

  /**
   * PATCH /emergency/profile
   * Update the patient's emergency profile visibility settings.
   */
  public static async updateProfileSettings(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const patientId = user?.patient_id || user?.id || 'demo-patient-123';
      if (!patientId) { sendError(res, 401, 'Patient identity not found.'); return; }

      const allowed = [
        'showBloodGroup', 'showAllergies', 'showMedications', 'showConditions',
        'showSurgeries', 'showEmergencyContacts', 'showPrimaryPhysician',
        'emergencyNotes', 'customAlerts', 'emergencyContacts',
      ];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (key in req.body) updates[key] = req.body[key];
      }

      const profile = await EmergencyService.updateProfileSettings(patientId, updates);
      sendSuccess(res, 200, profile, 'Emergency profile settings updated.');
    } catch (err: any) {
      logger.error('[EmergencyController.updateProfileSettings]', err);
      sendError(res, 500, err.message || 'Failed to update emergency profile settings.');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DOCTOR — Requires JWT auth + doctor role
  // ─────────────────────────────────────────────────────────────────

  /**
   * POST /emergency/access
   * Break-glass emergency access request from an authenticated doctor.
   */
  public static async breakGlassAccess(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

    if (!user) { sendError(res, 401, 'Authentication required.'); return; }
    if (user.role !== 'doctor') { sendError(res, 403, 'Only verified doctors may request emergency access.'); return; }

    const { credential, reasonCode, reasonText, requestedScope, durationHours } = req.body;

    // Input validation
    if (!credential || typeof credential !== 'string') {
      sendError(res, 400, 'Emergency credential token is required.');
      return;
    }
    if (!VALID_REASON_CODES.includes(reasonCode)) {
      sendError(res, 400, `Invalid reason code. Must be one of: ${VALID_REASON_CODES.join(', ')}`);
      return;
    }
    if (!reasonText || reasonText.trim().length < 10) {
      sendError(res, 400, 'Emergency justification text must be at least 10 characters.');
      return;
    }
    const validDurations = [0.25, 1, 4];
    const duration = parseFloat(durationHours) || 4;
    if (!validDurations.includes(duration)) {
      sendError(res, 400, 'Duration must be 0.25 (15min), 1 (1 hour), or 4 (4 hours).');
      return;
    }

    // Validate and sanitize scope
    const rawScope: string[] = Array.isArray(requestedScope) ? requestedScope : ['emergency.profile'];
    const scope = rawScope.filter((s) => VALID_SCOPES.includes(s));
    if (scope.length === 0) scope.push('emergency.profile');

    try {
      // 1. Resolve credential
      const resolved = await EmergencyService.resolveCredential(credential);
      if (!resolved || resolved.errorCode) {
        sendError(res, 404, 'Invalid, expired, or revoked emergency credential.');
        return;
      }

      // 2. Verify doctor identity
      const doctorProfile = await DoctorService.getDoctorProfileByUserId(user.id);
      if (!doctorProfile || doctorProfile.verificationStatus !== 'VERIFIED') {
        sendError(res, 403, 'Emergency access requires a verified doctor account. Your account is pending verification.');
        return;
      }

      // 3. Log break-glass initiation
      await EmergencyService.logEvent({
        patientId: resolved.patientId,
        actorId: user.id,
        actorType: 'DOCTOR',
        action: 'BREAK_GLASS_INITIATED',
        reasonCode,
        reasonText,
        scope,
        ipAddress,
      });

      // 4. Create session
      const session = await EmergencyService.createSession(
        resolved.credentialId,
        resolved.patientId,
        user.id,
        'DOCTOR',
        reasonCode,
        reasonText.trim(),
        scope,
        duration
      );

      // 5. Load emergency profile (within scope)
      const profile = await EmergencyService.getPublicProfile(resolved.patientId, resolved.credentialId);

      // 6. Log access granted
      EmergencyService.logEvent({
        sessionId: session.id,
        patientId: resolved.patientId,
        actorId: user.id,
        actorType: 'DOCTOR',
        action: 'ACCESS_GRANTED',
        resource: 'emergency.profile',
        reasonCode,
        reasonText,
        scope,
        ipAddress,
      }).catch(() => {});

      // 7. Notify patient (non-blocking)
      const patientUserRes = await query(
        `SELECT user_id FROM public.patients WHERE id = $1`,
        [resolved.patientId]
      ).catch(() => ({ rows: [] as any[] }));

      if (patientUserRes.rows[0]?.user_id) {
        EmergencyService.notifyPatient(
          patientUserRes.rows[0].user_id,
          doctorProfile.fullName,
          reasonCode,
          session.expiresAt
        ).catch(() => {});
      }

      // 8. Anchor to blockchain (async, non-blocking)
      const eventHash = require('crypto')
        .createHash('sha256')
        .update(`${session.id}:${resolved.patientId}:${Date.now()}`)
        .digest('hex');
      EmergencyService.anchorBlockchain(eventHash, resolved.patientId);

      // 9. Fetch patient database records (documents, timeline, labs)
      const documents = await EmergencyService.getPatientDocuments(resolved.patientId);
      const timeline = await EmergencyService.getPatientTimeline(resolved.patientId);
      const labs = await EmergencyService.getPatientLabs(resolved.patientId);

      sendSuccess(res, 200, {
        session: {
          id: session.id,
          issuedAt: session.issuedAt,
          expiresAt: session.expiresAt,
          scope: session.scope,
          durationHours: duration,
        },
        doctor: {
          name: doctorProfile.fullName,
          specialization: doctorProfile.specialization,
          hospital: doctorProfile.hospitalAffiliation,
          verificationStatus: doctorProfile.verificationStatus,
        },
        profile,
        documents,
        timeline,
        labs,
        reasonCode,
        reasonText: reasonText.trim(),
      }, 'Emergency access granted. This session is time-limited and fully audited.');
    } catch (err: any) {
      logger.error('[EmergencyController.breakGlassAccess]', err);
      sendError(res, 500, 'Emergency access request failed. Please try again.');
    }
  }

  /**
   * POST /emergency/session/:id/revoke
   * Revoke an active emergency session.
   */
  public static async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { id: sessionId } = req.params;

      if (!sessionId) { sendError(res, 400, 'Session ID required.'); return; }

      const session = await EmergencyService.validateSession(sessionId as string);
      if (!session) {
        sendError(res, 404, 'Session not found or already expired/revoked.');
        return;
      }

      // Only the actor who created the session or the patient can revoke it
      const isActor = session.actorId === user.id;
      const isPatient = user.role === 'patient' && user.patient_id === session.patientId;

      if (!isActor && !isPatient) {
        sendError(res, 403, 'You are not authorized to revoke this session.');
        return;
      }

      await EmergencyService.revokeSession(sessionId as string, user.id as string);

      EmergencyService.logEvent({
        sessionId: sessionId as string,
        patientId: session.patientId,
        actorId: user.id as string,
        actorType: user.role === 'doctor' ? 'DOCTOR' : 'PUBLIC',
        action: 'SESSION_REVOKED',
      }).catch(() => {});

      sendSuccess(res, 200, null, 'Emergency access session revoked.');
    } catch (err: any) {
      logger.error('[EmergencyController.revokeSession]', err);
      sendError(res, 500, 'Failed to revoke session.');
    }
  }
}
