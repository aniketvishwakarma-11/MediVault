import { Client } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

// Environment variable configuration with production defaults
export const MINIO_CONFIG = {
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  bucketName: process.env.MINIO_BUCKET || 'medical-records',
  useSSL: process.env.MINIO_USE_SSL === 'true',
};

export const V2_BUCKETS = [
  { name: 'medical-records', public: false },
  { name: 'medivault-documents', public: false },
  { name: 'medivault-public', public: true },
  { name: 'medivault-temp', public: false },
  { name: 'medivault-archives', public: false },
];

// Helper to detect region for cloud S3 providers (Backblaze B2, AWS, Supabase, etc.)
function detectRegion(endPoint: string): string | undefined {
  if (process.env.MINIO_REGION) return process.env.MINIO_REGION;
  if (endPoint.includes('backblazeb2.com')) {
    const parts = endPoint.split('.');
    if (parts.length >= 3) return parts[1]; // e.g. s3.us-east-005.backblazeb2.com -> us-east-005
  }
  return undefined;
}

// Singleton Client Instance
let minioClientInstance: Client | null = null;

/**
 * Returns the MinIO singleton client instance.
 */
export const getMinioClient = (): Client => {
  if (!minioClientInstance) {
    const clientOptions: any = {
      endPoint: MINIO_CONFIG.endPoint,
      port: MINIO_CONFIG.port,
      useSSL: MINIO_CONFIG.useSSL,
      accessKey: MINIO_CONFIG.accessKey,
      secretKey: MINIO_CONFIG.secretKey,
    };

    const region = detectRegion(MINIO_CONFIG.endPoint);
    if (region) {
      clientOptions.region = region;
    }

    minioClientInstance = new Client(clientOptions);
  }
  return minioClientInstance;
};

/**
 * Returns the configured medical records bucket name.
 */
export const getMinioBucketName = (): string => {
  return MINIO_CONFIG.bucketName;
};

/**
 * Health check utility to verify MinIO / S3 connectivity.
 */
export const checkMinioHealth = async (): Promise<boolean> => {
  try {
    const client = getMinioClient();
    return await client.bucketExists(MINIO_CONFIG.bucketName);
  } catch (error) {
    console.error('[MinIO Health Check Error]:', error);
    return false;
  }
};

/**
 * Verifies the configured bucket exists, creating it automatically if running locally.
 * Works seamlessly with cloud providers (Backblaze B2, Supabase S3) and local MinIO.
 */
export const initializeMinioBucket = async (maxRetries = 2, retryDelayMs = 1000): Promise<void> => {
  const client = getMinioClient();
  const bucket = MINIO_CONFIG.bucketName;
  const isLocal = MINIO_CONFIG.endPoint === '127.0.0.1' || MINIO_CONFIG.endPoint === 'localhost';

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`[Storage Initialization] Verifying bucket "${bucket}" on ${MINIO_CONFIG.endPoint} (Attempt ${attempt}/${maxRetries})...`);

      const bucketExists = await client.bucketExists(bucket);
      if (bucketExists) {
        console.log(`✅ [Storage Initialization] Cloud bucket "${bucket}" connected and ready.`);
        return;
      }

      if (isLocal) {
        console.log(`[Storage Initialization] Creating local bucket "${bucket}"...`);
        await client.makeBucket(bucket, 'us-east-1');
        console.log(`✅ [Storage Initialization] Local bucket "${bucket}" ready.`);
        return;
      } else {
        console.warn(`[Storage Initialization] Bucket "${bucket}" not found on ${MINIO_CONFIG.endPoint}.`);
        return;
      }
    } catch (error: any) {
      console.warn(`[Storage Note] Attempt ${attempt}/${maxRetries} - ${error.message || error}`);
      if (attempt >= maxRetries) {
        console.warn('⚠️ Object storage is currently offline or credentials need review.');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};
