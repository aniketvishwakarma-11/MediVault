import { AIProviderRegistry } from './providers/provider.registry';
import { AIExecutionMetrics } from './providers/ai_provider.interface';
import { DocumentRepository } from '../../repositories/document.repository';
import { logger } from '../../utils/logger';

export class ChatAIService {
  /**
   * Health Copilot AI Chat Service.
   * STRICTLY uses NVIDIA NIM ONLY (CHAT_MODEL=nvidia).
   * Gemini is NEVER called for conversational chat requests.
   */
  public static async chat(
    patientId: string,
    prompt: string
  ): Promise<{ text: string; sources: string[]; metrics: AIExecutionMetrics }> {
    const chatModelName = (process.env.CHAT_MODEL || 'nvidia').toLowerCase();
    const chatProvider = AIProviderRegistry.getProvider(chatModelName);

    logger.info(`[Chat AI Service] Handling patient query using dedicated chat provider "${chatProvider.name}" (NVIDIA NIM ONLY)...`);

    // 1. Retrieve patient context documents from repository
    const patientDocs = await DocumentRepository.getRecentDocuments(patientId, 10);
    const documentSummaries = patientDocs.map(
      (d) => `- [${d.document_name || d.original_filename}] Category: ${d.document_category}, Hospital: ${d.hospital_name || 'N/A'}, Doctor: ${d.doctor_name || 'N/A'}, Date: ${d.visit_date || 'N/A'}`
    );

    // 2. Delegate chat to NVIDIA NIM Provider
    const result = await chatProvider.chat(prompt, documentSummaries);

    // Log telemetry
    logger.info(
      `[Chat Telemetry] Provider: ${result.metrics.providerUsed} | Latency: ${result.metrics.processingTimeMs}ms | Sources: ${result.sources.length}`
    );

    return result;
  }
}
