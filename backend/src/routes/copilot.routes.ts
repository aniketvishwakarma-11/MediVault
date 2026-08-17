import { Router } from 'express';
import { CopilotController } from '../controllers/copilot.controller';
import { apiRateLimiter } from '../middleware/security';

const router = Router();

// ─── Chat Endpoints ──────────────────────────────────────────────────

/**
 * @route   POST /copilot/chat
 * @desc    Send a message to the AI Health Copilot (general mode or document-focused).
 *          Supports conversation memory via session_id and document grounding via document_id.
 * @body    { prompt: string, patient_id?: string, session_id?: string, document_id?: string }
 * @access  Authenticated
 */
router.post('/chat', apiRateLimiter, CopilotController.chat);

/**
 * @route   POST /copilot/chat/document/:docId
 * @desc    Chat about a specific document. All AI answers are grounded exclusively in that document.
 * @body    { prompt: string, patient_id?: string, session_id?: string }
 * @access  Authenticated
 */
router.post('/chat/document/:docId', apiRateLimiter, CopilotController.chatWithDocument);

// ─── Session Management ──────────────────────────────────────────────

/**
 * @route   POST /copilot/sessions
 * @desc    Create a new chat session.
 * @body    { patient_id?: string, mode?: 'general' | 'document', document_id?: string }
 * @access  Authenticated
 */
router.post('/sessions', apiRateLimiter, CopilotController.createSession);

/**
 * @route   GET /copilot/sessions
 * @desc    List all chat sessions for a patient.
 * @query   patient_id
 * @access  Authenticated
 */
router.get('/sessions', apiRateLimiter, CopilotController.listSessions);

/**
 * @route   GET /copilot/sessions/:id
 * @desc    Get a chat session with all messages (conversation history).
 * @access  Authenticated
 */
router.get('/sessions/:id', apiRateLimiter, CopilotController.getSession);

/**
 * @route   DELETE /copilot/sessions/:id
 * @desc    Archive (soft-delete) a chat session.
 * @access  Authenticated
 */
router.delete('/sessions/:id', apiRateLimiter, CopilotController.deleteSession);

// ─── Insights & Suggestions ──────────────────────────────────────────

/**
 * @route   GET /copilot/insights
 * @desc    Get proactive health insights aggregated from patient documents.
 * @query   patient_id
 * @access  Authenticated
 */
router.get('/insights', apiRateLimiter, CopilotController.getInsights);

/**
 * @route   GET /copilot/suggestions
 * @desc    Get smart context-aware question suggestions based on patient records.
 * @query   patient_id
 * @access  Authenticated
 */
router.get('/suggestions', apiRateLimiter, CopilotController.getSuggestions);

export default router;
