import { Router, Request, Response } from 'express';
import { AIProviderRegistry } from '../services/ai/providers/provider.registry';
import { ChatAIService } from '../services/ai/chat_ai.service';
import { sendSuccess, sendError } from '../utils/response';
import { apiRateLimiter } from '../middleware/security';
import { ValidationError } from '../errors/AppError';

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
    const patientId = patient_id || req.user?.patient_id || req.user?.id;

    if (!patientId) {
      throw new ValidationError(
        'PATIENT_ID_REQUIRED',
        'Patient ID is required to query medical chat records',
        'Patient Session Required',
        'To protect confidential medical history, a valid patient session or patient identifier must be provided.',
        'Please ensure you are logged in to your patient account.'
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new ValidationError('PROMPT_REQUIRED', 'Prompt string parameter is required.');
    }

    const result = await ChatAIService.chat(patientId, prompt.trim());

    return sendSuccess(res, 200, result, 'AI response generated successfully via dedicated NVIDIA NIM engine.');
  } catch (err: any) {
    return sendError(res, err);
  }
});

export default router;
