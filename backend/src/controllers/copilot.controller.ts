import { Request, Response } from 'express';
import { CopilotService } from '../services/ai/copilot.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { ValidationError, ResourceNotFoundError } from '../errors/AppError';

/**
 * MediVault V2 — AI Copilot Controller
 * REST API handlers for the patient AI Health Copilot.
 */
export class CopilotController {

  private static resolvePatientId(req: Request, explicitId?: string): string {
    const pid = explicitId || req.user?.patient_id || req.user?.id;
    if (!pid) {
      throw new ValidationError(
        'PATIENT_ID_REQUIRED',
        'Patient identifier is required to access health records',
        'Patient Session Required',
        'To protect confidential medical history, a valid patient session or patient identifier must be provided.',
        'Please ensure you are logged in to your patient account.'
      );
    }
    return pid;
  }

  /**
   * POST /copilot/chat
   * Send a message to the AI copilot (general or document-focused mode).
   */
  public static async chat(req: Request, res: Response) {
    try {
      const { prompt, patient_id, session_id, document_id } = req.body;
      const patientId = CopilotController.resolvePatientId(req, patient_id);

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        throw new ValidationError('PROMPT_REQUIRED', 'A valid prompt string is required.');
      }

      if (prompt.length > 2000) {
        throw new ValidationError('PROMPT_TOO_LONG', 'Prompt exceeds maximum length of 2000 characters.');
      }

      const result = await CopilotService.chat({
        patientId,
        prompt: prompt.trim(),
        sessionId: session_id,
        documentId: document_id,
      });

      return sendSuccess(res, 200, {
        message: result.message,
        session: result.session,
        sources: result.sources,
        metrics: {
          provider: result.metrics.providerUsed,
          latencyMs: result.metrics.processingTimeMs,
          fallbackTriggered: result.metrics.fallbackTriggered,
        },
        suggestedFollowUps: result.suggestedFollowUps,
      }, 'AI Copilot response generated successfully.');

    } catch (err: any) {
      logger.error('[CopilotController] chat error:', err);
      return sendError(res, err);
    }
  }

  /**
   * POST /copilot/chat/document/:docId
   * Send a message focused on a specific document.
   */
  public static async chatWithDocument(req: Request, res: Response) {
    try {
      const docId = String(req.params.docId || '');
      const { prompt, patient_id, session_id } = req.body;
      const patientId = CopilotController.resolvePatientId(req, patient_id);

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        throw new ValidationError('PROMPT_REQUIRED', 'A valid prompt string is required.');
      }

      if (!docId) {
        throw new ValidationError('DOCUMENT_ID_REQUIRED', 'Document ID parameter is required.');
      }

      const result = await CopilotService.chat({
        patientId,
        documentId: docId,
        prompt: prompt.trim(),
        sessionId: session_id ? String(session_id) : undefined,
      });

      return sendSuccess(res, 200, {
        message: result.message,
        session: result.session,
        sources: result.sources,
        metrics: {
          provider: result.metrics.providerUsed,
          latencyMs: result.metrics.processingTimeMs,
          fallbackTriggered: result.metrics.fallbackTriggered,
        },
        suggestedFollowUps: result.suggestedFollowUps,
      }, 'Document-focused response generated successfully.');

    } catch (err: any) {
      logger.error('[CopilotController] chatWithDocument error:', err);
      return sendError(res, err);
    }
  }

  /**
   * POST /copilot/sessions
   * Create a new chat session.
   */
  public static async createSession(req: Request, res: Response) {
    try {
      const { patient_id, mode, document_id } = req.body;
      const patientId = CopilotController.resolvePatientId(req, patient_id);

      const session = await CopilotService.createSession(
        patientId,
        mode || 'general',
        document_id
      );

      return sendSuccess(res, 201, session, 'Chat session created successfully.');
    } catch (err: any) {
      logger.error('[CopilotController] createSession error:', err);
      return sendError(res, err);
    }
  }

  /**
   * GET /copilot/sessions
   * List all chat sessions for a patient.
   */
  public static async listSessions(req: Request, res: Response) {
    try {
      const patientId = CopilotController.resolvePatientId(req, req.query.patient_id as string);
      const sessions = await CopilotService.listSessions(patientId);
      return sendSuccess(res, 200, sessions, `Retrieved ${sessions.length} chat sessions.`);
    } catch (err: any) {
      logger.error('[CopilotController] listSessions error:', err);
      return sendError(res, err);
    }
  }

  /**
   * GET /copilot/sessions/:id
   * Get a chat session with all its messages.
   */
  public static async getSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const idStr = String(id || '');
      if (!idStr) throw new ValidationError('SESSION_ID_REQUIRED', 'Session ID is required.');

      const result = await CopilotService.getSessionWithMessages(idStr);
      if (!result) throw new ResourceNotFoundError('Chat Session', idStr);

      return sendSuccess(res, 200, result, 'Chat session retrieved with messages.');
    } catch (err: any) {
      logger.error('[CopilotController] getSession error:', err);
      return sendError(res, err);
    }
  }

  /**
   * DELETE /copilot/sessions/:id
   * Archive (soft-delete) a chat session.
   */
  public static async deleteSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const idStr = String(id || '');
      if (!idStr) throw new ValidationError('SESSION_ID_REQUIRED', 'Session ID is required.');

      const success = await CopilotService.archiveSession(idStr);
      if (!success) throw new ResourceNotFoundError('Chat Session', idStr);

      return sendSuccess(res, 200, { archived: true }, 'Chat session archived successfully.');
    } catch (err: any) {
      logger.error('[CopilotController] deleteSession error:', err);
      return sendError(res, err);
    }
  }

  /**
   * GET /copilot/insights
   * Get proactive health insights for a patient.
   */
  public static async getInsights(req: Request, res: Response) {
    try {
      const patientId = CopilotController.resolvePatientId(req, req.query.patient_id as string);
      const insights = await CopilotService.getHealthInsights(patientId);
      return sendSuccess(res, 200, insights, 'Health insights retrieved successfully.');
    } catch (err: any) {
      logger.error('[CopilotController] getInsights error:', err);
      return sendError(res, err);
    }
  }

  /**
   * GET /copilot/suggestions
   * Get smart context-aware question suggestions.
   */
  public static async getSuggestions(req: Request, res: Response) {
    try {
      const patientId = CopilotController.resolvePatientId(req, req.query.patient_id as string);
      const suggestions = await CopilotService.getSmartSuggestions(patientId);
      return sendSuccess(res, 200, suggestions, 'Smart suggestions generated successfully.');
    } catch (err: any) {
      logger.error('[CopilotController] getSuggestions error:', err);
      return sendError(res, err);
    }
  }
}
