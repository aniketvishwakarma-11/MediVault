import { query } from '../config/db';
import { logger } from '../utils/logger';

/**
 * SystemSettingsCache
 * ───────────────────
 * Single source of truth for runtime-changeable platform settings.
 * Reads from public.system_settings on first access, caches in memory.
 * Call invalidate() after any updateSystemSettings() call to force a fresh read.
 */

export interface AIEngineSettings {
  default_model: string;
  confidence_threshold: number;
  max_tokens: number;
  enable_rag: boolean;
  temperature: number;
}

export interface SecuritySettings {
  session_timeout_minutes: number;
  require_2fa: boolean;
  max_login_attempts: number;
  password_min_length: number;
  enforce_strong_passwords: boolean;
}

export interface StorageSettings {
  max_file_size_mb: number;
  retention_years: number;
  auto_archive_inactive: boolean;
  allowed_mimes: string[];
}

const DEFAULT_AI: AIEngineSettings = {
  default_model: 'gemini-3.6-flash',
  confidence_threshold: 0.85,
  max_tokens: 4096,
  enable_rag: true,
  temperature: 0.1,
};

const DEFAULT_SECURITY: SecuritySettings = {
  session_timeout_minutes: 60,
  require_2fa: false,
  max_login_attempts: 5,
  password_min_length: 8,
  enforce_strong_passwords: true,
};

const DEFAULT_STORAGE: StorageSettings = {
  max_file_size_mb: 50,
  retention_years: 7,
  auto_archive_inactive: true,
  allowed_mimes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
};

let cachedAI: AIEngineSettings | null = null;
let cachedSecurity: SecuritySettings | null = null;
let cachedStorage: StorageSettings | null = null;

async function readKey<T>(key: string, defaultVal: T): Promise<T> {
  try {
    const res = await query(
      `SELECT value FROM public.system_settings WHERE key = $1`,
      [key]
    );
    if (res.rows.length > 0) {
      const val = res.rows[0].value;
      return (typeof val === 'string' ? JSON.parse(val) : val) as T;
    }
  } catch (err) {
    logger.warn(`[SystemSettingsCache] Could not read key "${key}":`, err);
  }
  return defaultVal;
}

export const SystemSettingsCache = {
  /** Resolve provider name from model string saved in settings */
  resolveProviderName(modelValue: string): string {
    if (!modelValue) return 'gemini';
    const m = modelValue.toLowerCase();
    if (m.startsWith('nvidia') || m.includes('llama')) return 'nvidia';
    if (m.startsWith('gemini') || m.includes('google')) return 'gemini';
    return m; // pass through
  },

  async getAI(): Promise<AIEngineSettings> {
    if (!cachedAI) {
      cachedAI = await readKey<AIEngineSettings>('ai_engine', DEFAULT_AI);
      logger.info(`[SystemSettingsCache] AI engine loaded: model=${cachedAI.default_model}, max_tokens=${cachedAI.max_tokens}, rag=${cachedAI.enable_rag}`);
    }
    return cachedAI;
  },

  async getSecurity(): Promise<SecuritySettings> {
    if (!cachedSecurity) {
      cachedSecurity = await readKey<SecuritySettings>('security', DEFAULT_SECURITY);
    }
    return cachedSecurity;
  },

  async getStorage(): Promise<StorageSettings> {
    if (!cachedStorage) {
      cachedStorage = await readKey<StorageSettings>('storage', DEFAULT_STORAGE);
    }
    return cachedStorage;
  },

  /** Call this after any settings update to force fresh DB read on next access */
  invalidate(key?: 'ai_engine' | 'security' | 'storage' | 'all') {
    if (!key || key === 'all' || key === 'ai_engine') cachedAI = null;
    if (!key || key === 'all' || key === 'security') cachedSecurity = null;
    if (!key || key === 'all' || key === 'storage') cachedStorage = null;
    logger.info(`[SystemSettingsCache] Cache invalidated (key=${key || 'all'})`);
  },
};
