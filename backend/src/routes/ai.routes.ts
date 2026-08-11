import { Router, Request, Response } from 'express';
import { AIProviderRegistry } from '../services/ai/providers/provider.registry';
import { ChatAIService } from '../services/ai/chat_ai.service';
import { sendSuccess, sendError } from '../utils/response';
import { apiRateLimiter } from '../middleware/security';

const router = Router();

/**
 * @route   GET /system/ai/status
 * @route   GET /ai/status
 * @desc    System AI Health Status & Telemetry Endpoint. Ping check for Gemini & NVIDIA NIM.
 * @access  Public / Authenticated
 */
router.get('/status', apiRateLimiter, async (req: Request, res: Response) => {
  try {
    const providers = AIProviderRegistry.getAllProviders();
    const healthPings = await Promise.all(providers.map((p) => p.healthCheck()));

    const providerStatusMap: Record<string, any> = {};
    healthPings.forEach((hp) => {
      providerStatusMap[hp.provider] = {
        status: hp.status,
        latencyMs: hp.latencyMs,
        error: hp.error || null,
      };
    });

    const primaryModel = process.env.PRIMARY_MEDICAL_MODEL || 'gemini';
    const fallbackModel = process.env.FALLBACK_MEDICAL_MODEL || 'nvidia';
    const chatModel = process.env.CHAT_MODEL || 'nvidia';

    const systemStatus = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      config: {
        primaryMedicalModel: primaryModel,
        fallbackMedicalModel: fallbackModel,
        chatModel: chatModel,
        fallbackEnabled: true,
      },
      providers: providerStatusMap,
    };

    return sendSuccess(res, 200, systemStatus, 'AI Architecture System Status retrieved successfully.');
  } catch (error: any) {
    return sendError(res, 500, error.message || 'Failed to retrieve AI system status.');
  }
});

/**
 * @route   POST /ai/chat
 * @desc    AI Health Copilot Chat (Powered strictly by NVIDIA NIM ONLY)
 * @access  Authenticated
 */
router.post('/chat', apiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { prompt, patient_id } = req.body;
    const patientId = patient_id || req.user?.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d';

    if (!prompt || typeof prompt !== 'string') {
      return sendError(res, 400, 'Prompt string parameter is required.');
    }

    const result = await ChatAIService.chat(patientId, prompt);

    return sendSuccess(res, 200, result, 'AI response generated successfully via dedicated NVIDIA NIM engine.');
  } catch (err: any) {
    return sendError(res, 500, err.message || 'AI chat generation failed.');
  }
});

export default router;
