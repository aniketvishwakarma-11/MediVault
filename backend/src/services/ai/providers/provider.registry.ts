import { AIProvider } from './ai_provider.interface';
import { GeminiProvider } from './gemini.provider';
import { NvidiaProvider } from './nvidia.provider';
import { logger } from '../../../utils/logger';

export class AIProviderRegistry {
  private static providers: Map<string, AIProvider> = new Map();

  public static initialize(): void {
    if (this.providers.size > 0) return;

    const gemini = new GeminiProvider();
    const nvidia = new NvidiaProvider();

    this.providers.set(gemini.name, gemini);
    this.providers.set(nvidia.name, nvidia);

    logger.info(`[AI Provider Registry] Initialized ${this.providers.size} AI Providers: [${Array.from(this.providers.keys()).join(', ')}]`);
  }

  public static getProvider(name: string): AIProvider {
    this.initialize();
    const key = (name || 'gemini').toLowerCase();
    const provider = this.providers.get(key);

    if (!provider) {
      logger.warn(`[AI Provider Registry] Provider "${name}" not found. Falling back to GeminiProvider.`);
      return this.providers.get('gemini') || new GeminiProvider();
    }

    return provider;
  }

  public static getAllProviders(): AIProvider[] {
    this.initialize();
    return Array.from(this.providers.values());
  }
}
