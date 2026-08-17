import { Request, Response } from 'express';
import { CopilotService } from '../services/ai/copilot.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * MediVault V2 — AI Copilot Controller
 * REST API handlers for the patient AI Health Copilot.
 */
export class CopilotController {

  /**
   * POST /copilot/chat
   * Send a message to the AI copilot (general or document-focused mode).
   */
  public static async chat(req: Request, res: Response) {
    try {
      const { prompt, patient_id, session_id, document_id } = req.body;
      const patientId = patient_id || req.user?.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d';

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return sendError(res, 400, 'A valid prompt string is required.');
      }

      if (prompt.length > 2000) {
        return sendError(res, 400, 'Prompt exceeds maximum length of 2000 characters.');
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
      return sendError(res, 500, err.message || 'AI Copilot chat failed.');
    }
  }

  /**
   * POST /copilot/chat/document/:docId
   * Send a message focused on a specific document.
   */
  public static async chatWithDocument(req: Request, res: Response) {
    try {
      const { docId } = req.params;
      const { prompt, patient_id, session_id } = req.body;
      const patientId = patient_id || req.user?.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d';

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return sendError(res, 400, 'A valid prompt string is required.');
      }

      if (!docId) {
        return sendError(res, 400, 'Document ID parameter is required.');
      }

      const result = await CopilotService.chat({
        patientId,
        prompt: prompt.trim(),
        sessionId: session_id,
        documentId: docId,
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
      }, `AI Copilot document-focused response generated for document ${docId}.`);

    } catch (err: any) {
      logger.error('[CopilotController] chatWithDocument error:', err);
      return sendError(res, 500, err.message || 'AI Copilot document chat failed.');
    }
  }

  /**
   * POST /copilot/sessions
   * Create a new chat session.
   */
  public static async createSession(req: Request, res: Response) {
    try {
      const { patient_id, mode, document_id } = req.body;
      const patientId = patient_id || req.user?.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d';

      const session = await CopilotService.createSession(
        patientId,
        mode || 'general',
        document_id
      );

      return sendSuccess(res, 201, session, 'Chat session created successfully.');
    } catch (err: any) {
      logger.error('[CopilotController] createSession error:', err);
      return sendError(res, 500, err.message || 'Failed to create chat session.');
    }
  }

  /**
   * GET /copilot/sessions
   * List all chat sessions for a patient.
   */
  public static async listSessions(req: Request, res: Response) {
    try {
      const patientId = (req.query.patient_id as string) || req.user?.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d';
      const sessions = await CopilotService.listSessions(patientId);
      return sendSuccess(res, 200, sessions, `Retrieved ${sessions.length} chat sessions.`);
    } catch (err: any) {
      logger.error('[CopilotController] listSessions error:', err);
      return sendError(res, 500, err.message || 'Failed to list chat sessions.');
    }
  }

  /**
   * GET /copilot/sessions/:id
   * Get a chat session with all its messages.
   */
  public static async getSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return sendError(res, 400, 'Session ID is required.');

      const result = await CopilotService.getSessionWithMessages(id);
      if (!result) return sendError(res, 404, 'Chat session not found.');

      return sendSuccess(res, 200, result, 'Chat session retrieved with messages.');
    } catch (err: any) {
      logger.error('[CopilotController] getSession error:', err);
      return sendError(res, 500, err.message || 'Failed to retrieve chat session.');
    }
  }

  /**
   * DELETE /copilot/sessions/:id
   * Archive (soft-delete) a chat session.
   */
  public static async deleteSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return sendError(res, 400, 'Session ID is required.');

      const success = await CopilotService.archiveSession(id);
      if (!success) return sendError(res, 404, 'Chat session not found or already archived.');

      return sendSuccess(res, 200, { archived: true }, 'Chat session archived successfully.');
    } catch (err: any) {
      logger.error('[CopilotController] deleteSession error:', err);
      return sendError(res, 500, err.message || 'Failed to archive chat session.');
    }
  }

  /**
   * GET /copilot/insights
   * Get proactive health insights for a patient.
   */
  public static async getInsights(req: Request, res: Response) {
    try {
      const patientId = (req.query.patient_id as string) || req.user?.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d';
      const insights = await CopilotService.getHealthInsights(patientId);
      return sendSuccess(res, 200, insights, 'Health insights retrieved successfully.');
    } catch (err: any) {
      logger.error('[CopilotController] getInsights error:', err);
      return sendError(res, 500, err.message || 'Failed to retrieve health insights.');
    }
  }

  /**
   * GET /copilot/suggestions
   * Get smart context-aware question suggestions.
   */
  public static async getSuggestions(req: Request, res: Response) {
    try {
      const patientId = (req.query.patient_id as string) || req.user?.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d';
      const suggestions = await CopilotService.getSmartSuggestions(patientId);
      return sendSuccess(res, 200, suggestions, 'Smart suggestions generated successfully.');
    } catch (err: any) {
      logger.error('[CopilotController] getSuggestions error:', err);
      return sendError(res, 500, err.message || 'Failed to generate suggestions.');
    }
  }
}
