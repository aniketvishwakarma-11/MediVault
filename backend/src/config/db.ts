import { Pool } from 'pg';
import dotenv from 'dotenv';

// Ensure environment variables are loaded before Pool initialization
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medivault';
const isSupabaseOrRemote = connectionString.includes('supabase.co') || connectionString.includes('supabase.com') || process.env.NODE_ENV === 'production';

console.log(`[PostgreSQL DB] Configured URL: ${connectionString.split('@')[1] || 'localhost'}`);

export const isConnectionError = (err: any): boolean => {
  if (!err) return false;
  const code = err.code || err.errno;
  const message = err.message || String(err);
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === -4078 ||
    message.includes('ECONNREFUSED') ||
    message.includes('connect ECONNREFUSED') ||
    (Array.isArray(err.errors) && err.errors.some((e: any) => e.code === 'ECONNREFUSED' || e.errno === -4078))
  );
};

export const db = new Pool({
  connectionString,
  ssl: isSupabaseOrRemote ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

db.on('error', (err: Error) => {
  if (!isConnectionError(err)) {
    console.error('[PostgreSQL Pool Unexpected Error]:', err);
  }
});

export const query = (text: string, params?: any[]) => db.query(text, params);

