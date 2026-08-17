import { Router } from 'express';
import { DoctorCopilotController } from '../controllers/doctor-copilot.controller';
import { authenticateJWT } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/security';

const router = Router();

// ─── Auth guard — all routes require a verified doctor JWT ─────────────────
router.use(authenticateJWT);

// ─── Consented Patients (patient-picker for copilot) ──────────────────────

/**
 * @route   GET /api/doctor/copilot/consented-patients
 * @desc    Returns only real patients who have an active approved consent for this doctor.
 *          No dummy data. Used to populate the Active Patient dropdown in the Copilot UI.
 * @access  Authenticated Doctor
 */
router.get('/consented-patients', apiRateLimiter, DoctorCopilotController.getConsentedPatients);

// ─── Clinical Chat ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/doctor/copilot/chat
 * @desc    Send a clinical question about a consented patient.
 *          Returns an AI response grounded in the patient's full EMR.
 * @body    { patient_id: string, prompt: string, session_id?: string }
 * @access  Authenticated Doctor
 */
router.post('/chat', apiRateLimiter, DoctorCopilotController.chat);

// ─── Session Management ────────────────────────────────────────────────────

/**
 * @route   GET /api/doctor/copilot/sessions
 * @desc    List all clinical consultation sessions for a doctor + patient pair.
 * @query   patient_id
 * @access  Authenticated Doctor
 */
router.get('/sessions', apiRateLimiter, DoctorCopilotController.listSessions);

/**
 * @route   GET /api/doctor/copilot/sessions/:sessionId
 * @desc    Get a session with all messages.
 * @access  Authenticated Doctor
 */
router.get('/sessions/:sessionId', apiRateLimiter, DoctorCopilotController.getSession);

/**
 * @route   DELETE /api/doctor/copilot/sessions/:sessionId
 * @desc    Archive (soft-delete) a session.
 * @access  Authenticated Doctor
 */
router.delete('/sessions/:sessionId', apiRateLimiter, DoctorCopilotController.archiveSession);

// ─── AI Patient Brief ─────────────────────────────────────────────────────

/**
 * @route   GET /api/doctor/copilot/brief/:patientId
 * @desc    Get the AI-generated clinical brief for a patient (cached 30 min or fresh).
 *          Auto-generates brief if not cached. Also triggers alert generation in background.
 * @access  Authenticated Doctor
 */
router.get('/brief/:patientId', apiRateLimiter, DoctorCopilotController.getPatientBrief);

/**
 * @route   POST /api/doctor/copilot/brief/:patientId/regenerate
 * @desc    Force-regenerate the patient brief, bypassing the cache.
 * @access  Authenticated Doctor
 */
router.post('/brief/:patientId/regenerate', apiRateLimiter, DoctorCopilotController.regenerateBrief);

// ─── Clinical Tools ────────────────────────────────────────────────────────

/**
 * @route   POST /api/doctor/copilot/tools/drug-interactions
 * @desc    LLM-based drug interaction check against patient's full medication list.
 * @body    { patient_id: string, additional_drugs?: string[] }
 * @access  Authenticated Doctor
 */
router.post('/tools/drug-interactions', apiRateLimiter, DoctorCopilotController.checkDrugInteractions);

/**
 * @route   POST /api/doctor/copilot/tools/differential-dx
 * @desc    Differential diagnosis generator based on symptoms + patient history.
 * @body    { patient_id: string, symptoms: string[], additional_context?: string }
 * @access  Authenticated Doctor
 */
router.post('/tools/differential-dx', apiRateLimiter, DoctorCopilotController.differentialDiagnosis);

/**
 * @route   POST /api/doctor/copilot/tools/lab-trend
 * @desc    Analyze the trend of a specific lab value across all patient documents.
 * @body    { patient_id: string, test_name: string }
 * @access  Authenticated Doctor
 */
router.post('/tools/lab-trend', apiRateLimiter, DoctorCopilotController.analyzeLabTrend);

/**
 * @route   POST /api/doctor/copilot/tools/risk-score
 * @desc    Risk stratification using clinical scoring models.
 * @body    { patient_id: string, score_type: 'cardiovascular' | 'diabetes_complications' | 'ckd_progression' | 'general' }
 * @access  Authenticated Doctor
 */
router.post('/tools/risk-score', apiRateLimiter, DoctorCopilotController.calculateRiskScore);

/**
 * @route   POST /api/doctor/copilot/tools/compare-reports
 * @desc    AI-powered side-by-side comparison of two patient documents.
 * @body    { patient_id: string, doc_id_1: string, doc_id_2: string }
 * @access  Authenticated Doctor
 */
router.post('/tools/compare-reports', apiRateLimiter, DoctorCopilotController.compareReports);

// ─── Clinical Alerts ───────────────────────────────────────────────────────

/**
 * @route   GET /api/doctor/copilot/alerts
 * @desc    Get all active (non-dismissed) clinical alerts for a patient.
 * @query   patient_id
 * @access  Authenticated Doctor
 */
router.get('/alerts', apiRateLimiter, DoctorCopilotController.getAlerts);

/**
 * @route   PATCH /api/doctor/copilot/alerts/:alertId/dismiss
 * @desc    Dismiss a clinical alert.
 * @access  Authenticated Doctor
 */
router.patch('/alerts/:alertId/dismiss', apiRateLimiter, DoctorCopilotController.dismissAlert);

export default router;
