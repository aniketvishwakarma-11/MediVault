import { AIProviderRegistry } from './providers/provider.registry';
import { MedicalAIAnalysis } from '../../types/medical_ai';
import { AIExecutionMetrics } from './providers/ai_provider.interface';
import { DocumentRepository } from '../../repositories/document.repository';
import { SystemSettingsCache } from '../system-settings-cache.service';
import { logger } from '../../utils/logger';

export class MedicalAIService {
  /**
   * Primary Document Processing Pipeline.
   * Reads default_model, max_tokens, confidence_threshold, temperature
   * from the admin settings DB (via SystemSettingsCache) so changes
   * made on the Settings page take effect immediately without a restart.
   * Falls back to env vars / defaults if DB is unavailable.
   */
  public static async processDocument(
    ocrText: string,
    originalFilename: string,
    category?: string,
    documentId?: string,
    fileBuffer?: Buffer,
    mimeType?: string
  ): Promise<{ data: MedicalAIAnalysis; metrics: AIExecutionMetrics }> {
    // ── Read live settings from DB (cached in memory, invalidated on save) ──
    const aiSettings = await SystemSettingsCache.getAI().catch(() => null);

    const primaryName = aiSettings
      ? SystemSettingsCache.resolveProviderName(aiSettings.default_model)
      : (process.env.PRIMARY_MEDICAL_MODEL || 'gemini').toLowerCase();
    const fallbackName = (process.env.FALLBACK_MEDICAL_MODEL || 'nvidia').toLowerCase();
    const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '3', 10);

    const primaryProvider = AIProviderRegistry.getProvider(primaryName);
    const fallbackProvider = AIProviderRegistry.getProvider(fallbackName);

    let retries = 0;
    let fallbackTriggered = false;

    // 1. Attempt Primary Provider (Gemini 2.5 Flash) with Exponential Backoff
    while (retries <= maxRetries) {
      try {
        if (retries > 0) {
          const delayMs = Math.min(1000 * Math.pow(2, retries - 1) + Math.random() * 200, 8000);
          logger.info(`[Medical AI Service] Retrying primary provider "${primaryName}" (Attempt ${retries}/${maxRetries}) after ${Math.round(delayMs)}ms delay...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          logger.info(`[Medical AI Service] Executing primary medical provider "${primaryName}" for document "${originalFilename}"...`);
        }

        const result = await primaryProvider.processMedicalDocument(ocrText, originalFilename, category, fileBuffer, mimeType);
        result.metrics.retries = retries;
        result.metrics.fallbackTriggered = false;
        result.data.analysis_timestamp = new Date().toISOString();
        result.data.ai_model = result.metrics.providerUsed === 'nvidia' 
          ? 'NVIDIA NIM (Llama 3 70B Instruct)' 
          : 'Google Gemini 2.5 Flash';

        this.logTelemetry(documentId, result.metrics);
        return result;
      } catch (err: any) {
        retries++;
        const errMessage = err.message || String(err);
        const isTransient = errMessage.includes('429') || errMessage.includes('quota') || errMessage.includes('500') || errMessage.includes('timeout') || errMessage.includes('FETCH_ERROR');

        logger.warn(`[Medical AI Service Warning] Primary provider "${primaryName}" failed (Attempt ${retries}/${maxRetries + 1}): ${errMessage}`);

        if (!isTransient || retries > maxRetries) {
          logger.warn(`[Medical AI Service Failover] Primary provider "${primaryName}" failed or retries exhausted. Triggering automatic failover to "${fallbackName}"...`);
          break;
        }
      }
    }

    // 2. Trigger Automatic Failover to NVIDIA NIM Provider
    try {
      fallbackTriggered = true;
      logger.info(`[Medical AI Service] Executing failover medical provider "${fallbackName}" for document "${originalFilename}"...`);
      const fallbackResult = await fallbackProvider.processMedicalDocument(ocrText, originalFilename, category, fileBuffer, mimeType);
      fallbackResult.metrics.retries = retries;
      fallbackResult.metrics.fallbackTriggered = true;
      fallbackResult.data.analysis_timestamp = new Date().toISOString();
      fallbackResult.data.ai_model = fallbackResult.metrics.providerUsed === 'nvidia' 
        ? 'NVIDIA NIM (Llama 3 70B Instruct)' 
        : 'Google Gemini 2.5 Flash';

      this.logTelemetry(documentId, fallbackResult.metrics);
      return fallbackResult;
    } catch (fallbackErr: any) {
      logger.error(`[Medical AI Service Critical Error] Both primary "${primaryName}" and fallback "${fallbackName}" providers failed:`, fallbackErr);
      throw new Error(`Medical AI Processing failed on both primary (${primaryName}) and fallback (${fallbackName}) models.`);
    }
  }

  /**
   * Logs execution telemetry to PostgreSQL and system loggers.
   */
  private static async logTelemetry(documentId?: string, metrics?: AIExecutionMetrics): Promise<void> {
    if (!metrics) return;

    logger.info(
      `[AI Telemetry Log] Provider Used: ${metrics.providerUsed} | Time: ${metrics.processingTimeMs}ms | Retries: ${metrics.retries} | Fallback: ${metrics.fallbackTriggered} | Confidence: ${metrics.confidence}`
    );

    if (documentId) {
      await DocumentRepository.createAITelemetryLog(documentId, metrics);
    }
  }
}
