import { MedicalAIAnalysis } from '../../../types/medical_ai';

export interface HealthCheckResult {
  provider: string;
  status: 'Online' | 'Offline';
  latencyMs: number;
  error?: string;
}

export interface AIExecutionMetrics {
  providerUsed: string;
  processingTimeMs: number;
  retries: number;
  fallbackTriggered: boolean;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCost?: number;
  confidence: number;
  errorMessage?: string;
}

export interface AIProvider {
  readonly name: string;

  /**
   * Processes medical document OCR raw text and returns structured MedicalAIAnalysis JSON + metrics.
   */
  processMedicalDocument(
    ocrText: string,
    originalFilename: string,
    category?: string
  ): Promise<{ data: MedicalAIAnalysis; metrics: AIExecutionMetrics }>;

  /**
   * Powers conversational AI Health Copilot chat.
   */
  chat(
    prompt: string,
    contextDocuments: string[]
  ): Promise<{ text: string; sources: string[]; metrics: AIExecutionMetrics }>;

  /**
   * Generates vector embedding array for semantic RAG search.
   */
  generateEmbeddings(text: string): Promise<number[]>;

  /**
   * Runtime ping check for service availability.
   */
  healthCheck(): Promise<HealthCheckResult>;
}
