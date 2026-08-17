import { Request, Response } from 'express';
import { DoctorCopilotService } from '../services/ai/doctor-copilot.service';
import { DoctorCopilotRepository } from '../repositories/doctor-copilot.repository';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * MediVault — Doctor AI Copilot Controller
 *
 * REST API handlers for the clinician-facing AI Copilot.
 * Every endpoint requires an authenticated doctor JWT.
 * Consent is verified inside DoctorCopilotService — never skip it.
 */
export class DoctorCopilotController {

  // ─── Clinical Chat ────────────────────────────────────────────────────────

  /**
   * POST /api/doctor/copilot/chat
   * Send a clinical question about a consented patient.
   * Body: { patient_id, prompt, session_id? }
   */
  public static async chat(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }

      const { patient_id, prompt, session_id } = req.body;

      if (!patient_id) {
        sendError(res, 400, 'patient_id is required.');
        return;
      }
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        sendError(res, 400, 'A valid prompt string is required.');
        return;
      }
      if (prompt.length > 3000) {
        sendError(res, 400, 'Prompt exceeds maximum length of 3000 characters.');
        return;
      }

      const result = await DoctorCopilotService.chat({
        doctorId,
        patientId: patient_id,
        prompt: prompt.trim(),
        sessionId: session_id,
      });

      sendSuccess(res, 200, {
        message: result.message,
        session: result.session,
        sources: result.sources,
        metrics: {
          provider: result.metrics.providerUsed,
          latencyMs: result.metrics.processingTimeMs,
          fallbackTriggered: result.metrics.fallbackTriggered,
        },
        suggestedFollowUps: result.suggestedFollowUps,
      }, 'Clinical AI response generated.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] chat error:', err);
      if (err.message?.includes('Access denied') || err.message?.includes('consent')) {
        sendError(res, 403, err.message);
      } else {
        sendError(res, 500, err.message || 'Doctor AI Copilot chat failed.');
      }
    }
  }

  // ─── Session Management ───────────────────────────────────────────────────

  /**
   * GET /api/doctor/copilot/sessions?patient_id=
   * List all sessions for this doctor + patient.
   */
  public static async listSessions(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const patientId = req.query.patient_id as string;
      if (!patientId) { sendError(res, 400, 'patient_id query parameter is required.'); return; }

      const sessions = await DoctorCopilotService.listSessions(doctorId, patientId);
      sendSuccess(res, 200, sessions, `${sessions.length} session(s) retrieved.`);
    } catch (err: any) {
      logger.error('[DoctorCopilotController] listSessions error:', err);
      sendError(res, 500, err.message || 'Failed to list sessions.');
    }
  }

  /**
   * GET /api/doctor/copilot/sessions/:sessionId
   * Get a specific session with all messages.
   */
  public static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const sessionIdStr = String(sessionId || '');
      if (!sessionIdStr) { sendError(res, 400, 'sessionId is required.'); return; }

      const result = await DoctorCopilotService.getSessionWithMessages(sessionIdStr);
      if (!result) { sendError(res, 404, 'Session not found.'); return; }

      sendSuccess(res, 200, result, 'Session retrieved with messages.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] getSession error:', err);
      sendError(res, 500, err.message || 'Failed to retrieve session.');
    }
  }

  /**
   * DELETE /api/doctor/copilot/sessions/:sessionId
   * Archive a session.
   */
  public static async archiveSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const sessionIdStr = String(sessionId || '');
      if (!sessionIdStr) { sendError(res, 400, 'sessionId is required.'); return; }

      const ok = await DoctorCopilotService.archiveSession(sessionIdStr);
      if (!ok) { sendError(res, 404, 'Session not found or already archived.'); return; }

      sendSuccess(res, 200, { archived: true }, 'Session archived successfully.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] archiveSession error:', err);
      sendError(res, 500, err.message || 'Failed to archive session.');
    }
  }

  // ─── AI Patient Brief ─────────────────────────────────────────────────────

  /**
   * GET /api/doctor/copilot/brief/:patientId
   * Get the AI patient brief (cached or freshly generated).
   */
  public static async getPatientBrief(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const { patientId } = req.params;
      const patientIdStr = String(patientId || '');
      if (!patientIdStr) { sendError(res, 400, 'patientId is required.'); return; }

      const brief = await DoctorCopilotService.getOrGenerateBrief(doctorId, patientIdStr);
      sendSuccess(res, 200, brief, 'Patient clinical brief retrieved.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] getPatientBrief error:', err);
      if (err.message?.includes('Access denied') || err.message?.includes('consent')) {
        sendError(res, 403, err.message);
      } else {
        sendError(res, 500, err.message || 'Failed to generate patient brief.');
      }
    }
  }

  /**
   * POST /api/doctor/copilot/brief/:patientId/regenerate
   * Force-regenerate the patient brief (bypasses cache).
   */
  public static async regenerateBrief(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const { patientId } = req.params;
      const patientIdStr = String(patientId || '');
      if (!patientIdStr) { sendError(res, 400, 'patientId is required.'); return; }

      const brief = await DoctorCopilotService.generateBrief(doctorId, patientIdStr);
      sendSuccess(res, 200, brief, 'Patient clinical brief regenerated.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] regenerateBrief error:', err);
      if (err.message?.includes('Access denied') || err.message?.includes('consent')) {
        sendError(res, 403, err.message);
      } else {
        sendError(res, 500, err.message || 'Failed to regenerate brief.');
      }
    }
  }

  // ─── Clinical Tools ───────────────────────────────────────────────────────

  /**
   * POST /api/doctor/copilot/tools/drug-interactions
   * LLM-based drug interaction checker using patient's medication list.
   * Body: { patient_id, additional_drugs?: string[] }
   */
  public static async checkDrugInteractions(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const { patient_id, additional_drugs = [] } = req.body;
      if (!patient_id) { sendError(res, 400, 'patient_id is required.'); return; }

      const result = await DoctorCopilotService.checkDrugInteractions(doctorId, patient_id, additional_drugs);
      sendSuccess(res, 200, result, 'Drug interaction analysis complete.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] checkDrugInteractions error:', err);
      sendError(res, err.message?.includes('Access denied') ? 403 : 500, err.message || 'Drug interaction check failed.');
    }
  }

  /**
   * POST /api/doctor/copilot/tools/differential-dx
   * Differential diagnosis generator.
   * Body: { patient_id, symptoms: string[], additional_context?: string }
   */
  public static async differentialDiagnosis(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const { patient_id, symptoms = [], additional_context = '' } = req.body;
      if (!patient_id) { sendError(res, 400, 'patient_id is required.'); return; }
      if (!Array.isArray(symptoms) || symptoms.length === 0) {
        sendError(res, 400, 'At least one symptom is required.'); return;
      }

      const result = await DoctorCopilotService.differentialDiagnosis(doctorId, patient_id, symptoms, additional_context);
      sendSuccess(res, 200, result, 'Differential diagnosis generated.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] differentialDiagnosis error:', err);
      sendError(res, err.message?.includes('Access denied') ? 403 : 500, err.message || 'Differential diagnosis failed.');
    }
  }

  /**
   * POST /api/doctor/copilot/tools/lab-trend
   * Lab trend analysis for a specific test.
   * Body: { patient_id, test_name }
   */
  public static async analyzeLabTrend(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const { patient_id, test_name } = req.body;
      if (!patient_id) { sendError(res, 400, 'patient_id is required.'); return; }
      if (!test_name) { sendError(res, 400, 'test_name is required.'); return; }

      const result = await DoctorCopilotService.analyzeLabTrend(doctorId, patient_id, test_name);
      sendSuccess(res, 200, result, 'Lab trend analysis complete.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] analyzeLabTrend error:', err);
      sendError(res, err.message?.includes('Access denied') ? 403 : 500, err.message || 'Lab trend analysis failed.');
    }
  }

  /**
   * POST /api/doctor/copilot/tools/risk-score
   * Risk stratification.
   * Body: { patient_id, score_type: 'cardiovascular' | 'diabetes_complications' | 'ckd_progression' | 'general' }
   */
  public static async calculateRiskScore(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const { patient_id, score_type = 'general' } = req.body;
      if (!patient_id) { sendError(res, 400, 'patient_id is required.'); return; }

      const validTypes = ['cardiovascular', 'diabetes_complications', 'ckd_progression', 'general'];
      if (!validTypes.includes(score_type)) {
        sendError(res, 400, `score_type must be one of: ${validTypes.join(', ')}.`); return;
      }

      const result = await DoctorCopilotService.calculateRiskScore(doctorId, patient_id, score_type);
      sendSuccess(res, 200, result, 'Risk stratification complete.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] calculateRiskScore error:', err);
      sendError(res, err.message?.includes('Access denied') ? 403 : 500, err.message || 'Risk score calculation failed.');
    }
  }

  /**
   * POST /api/doctor/copilot/tools/compare-reports
   * Side-by-side report comparison.
   * Body: { patient_id, doc_id_1, doc_id_2 }
   */
  public static async compareReports(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const { patient_id, doc_id_1, doc_id_2 } = req.body;
      if (!patient_id) { sendError(res, 400, 'patient_id is required.'); return; }
      if (!doc_id_1 || !doc_id_2) { sendError(res, 400, 'Both doc_id_1 and doc_id_2 are required.'); return; }
      if (doc_id_1 === doc_id_2) { sendError(res, 400, 'Please select two different documents to compare.'); return; }

      const result = await DoctorCopilotService.compareReports(doctorId, patient_id, doc_id_1, doc_id_2);
      sendSuccess(res, 200, result, 'Report comparison complete.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] compareReports error:', err);
      sendError(res, err.message?.includes('Access denied') ? 403 : 500, err.message || 'Report comparison failed.');
    }
  }

  // ─── Clinical Alerts ──────────────────────────────────────────────────────

  /**
   * GET /api/doctor/copilot/alerts?patient_id=
   * Get proactive clinical alerts for a patient.
   */
  public static async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const patientId = req.query.patient_id as string;
      if (!patientId) { sendError(res, 400, 'patient_id query parameter is required.'); return; }

      const alerts = await DoctorCopilotService.getAlerts(doctorId, patientId);
      sendSuccess(res, 200, alerts, `${alerts.length} clinical alert(s) retrieved.`);
    } catch (err: any) {
      logger.error('[DoctorCopilotController] getAlerts error:', err);
      sendError(res, 500, err.message || 'Failed to retrieve alerts.');
    }
  }

  /**
   * PATCH /api/doctor/copilot/alerts/:alertId/dismiss
   * Dismiss a clinical alert.
   */
  public static async dismissAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const alertIdStr = String(alertId || '');
      if (!alertIdStr) { sendError(res, 400, 'alertId is required.'); return; }

      const ok = await DoctorCopilotService.dismissAlert(alertIdStr);
      if (!ok) { sendError(res, 404, 'Alert not found.'); return; }

      sendSuccess(res, 200, { dismissed: true }, 'Alert dismissed.');
    } catch (err: any) {
      logger.error('[DoctorCopilotController] dismissAlert error:', err);
      sendError(res, 500, err.message || 'Failed to dismiss alert.');
    }
  }

  // ─── Consented Patients List ───────────────────────────────────────────────

  /**
   * GET /api/doctor/copilot/consented-patients
   * Returns only the real patients who have an active (approved, non-expired) consent
   * grant for the currently authenticated doctor. No dummy data — real DB only.
   */
  public static async getConsentedPatients(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) { sendError(res, 401, 'Authentication required.'); return; }

      const patients = await DoctorCopilotRepository.getConsentedPatients(doctorId);
      sendSuccess(res, 200, patients, `${patients.length} consented patient(s) retrieved.`);
    } catch (err: any) {
      logger.error('[DoctorCopilotController] getConsentedPatients error:', err);
      sendError(res, 500, err.message || 'Failed to retrieve consented patients.');
    }
  }
}

