import { AIProviderRegistry } from './providers/provider.registry';
import { AIExecutionMetrics } from './providers/ai_provider.interface';
import { DocumentRepository } from '../../repositories/document.repository';
import { SystemSettingsCache } from '../system-settings-cache.service';
import { logger } from '../../utils/logger';

export class ChatAIService {
  /**
   * Health Copilot AI Chat Service.
   * Reads the chat model from the admin settings DB so changes to
   * "Default Clinical Model" on the Settings page take effect immediately.
   * Falls back to env var CHAT_MODEL (default: nvidia) if DB unavailable.
   */
  public static async chat(
    patientId: string,
    prompt: string
  ): Promise<{ text: string; sources: string[]; metrics: AIExecutionMetrics }> {
    // ── Read live model from DB settings cache ──
    const aiSettings = await SystemSettingsCache.getAI().catch(() => null);
    const chatModelName = aiSettings
      ? SystemSettingsCache.resolveProviderName(aiSettings.default_model)
      : (process.env.CHAT_MODEL || 'nvidia').toLowerCase();

    const chatProvider = AIProviderRegistry.getProvider(chatModelName);

    logger.info(`[Chat AI Service] Handling patient query using provider "${chatProvider.name}" (resolved from settings: ${chatModelName})...`);

    // 1. Retrieve patient context documents from repository
    const patientDocs = await DocumentRepository.getRecentDocuments(patientId, 10);
    const documentSummaries = patientDocs.map(
      (d) => `- [${d.document_name || d.original_filename}] Category: ${d.document_category}, Hospital: ${d.hospital_name || 'N/A'}, Doctor: ${d.doctor_name || 'N/A'}, Date: ${d.visit_date || 'N/A'}`
    );

    // 2. Delegate chat to resolved Provider
    const result = await chatProvider.chat(prompt, documentSummaries);

    // Log telemetry
    logger.info(
      `[Chat Telemetry] Provider: ${result.metrics.providerUsed} | Latency: ${result.metrics.processingTimeMs}ms | Sources: ${result.sources.length}`
    );

    return result;
  }
}
