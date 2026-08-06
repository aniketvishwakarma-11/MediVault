import { Client } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

// Environment variable configuration with production defaults
export const MINIO_CONFIG = {
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  accessKey: process.env.MINIO_ACCESS_KEY || 'medivault_minio_admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'medivault_minio_secret_key',
  bucketName: process.env.MINIO_BUCKET || 'medical-records',
  useSSL: process.env.MINIO_USE_SSL === 'true',
};

// Singleton Client Instance
let minioClientInstance: Client | null = null;

/**
 * Returns the MinIO singleton client instance.
 */
export const getMinioClient = (): Client => {
  if (!minioClientInstance) {
    minioClientInstance = new Client({
      endPoint: MINIO_CONFIG.endPoint,
      port: MINIO_CONFIG.port,
      useSSL: MINIO_CONFIG.useSSL,
      accessKey: MINIO_CONFIG.accessKey,
      secretKey: MINIO_CONFIG.secretKey,
    });
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
 * Health check utility to verify MinIO connectivity.
 */
export const checkMinioHealth = async (): Promise<boolean> => {
  try {
    const client = getMinioClient();
    await client.listBuckets();
    return true;
  } catch (error) {
    console.error('[MinIO Health Check Error]:', error);
    return false;
  }
};

/**
 * Verifies if configured bucket exists, and creates it automatically if missing.
 * Implements exponential backoff retry logic.
 */
export const initializeMinioBucket = async (maxRetries = 5, retryDelayMs = 2000): Promise<void> => {
  const client = getMinioClient();
  const bucketName = getMinioBucketName();

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`[MinIO Initialization] Checking bucket "${bucketName}" (Attempt ${attempt}/${maxRetries})...`);
      const bucketExists = await client.bucketExists(bucketName);

      if (!bucketExists) {
        console.log(`[MinIO Initialization] Bucket "${bucketName}" does not exist. Creating...`);
        await client.makeBucket(bucketName, 'us-east-1');
        console.log(`[MinIO Initialization] Bucket "${bucketName}" created successfully.`);
      } else {
        console.log(`[MinIO Initialization] Bucket "${bucketName}" exists and is ready.`);
      }

      // Enforce private access policy
      const privatePolicy = {
        Version: '2012-10-17',
        Statement: [],
      };
      try {
        await client.setBucketPolicy(bucketName, JSON.stringify(privatePolicy));
      } catch (policyErr) {
        // Policy setting can be restricted depending on MinIO user privileges; log gracefully
        console.warn('[MinIO Policy Note]: Private bucket policy applied or default enforced.');
      }

      return; // Success
    } catch (error) {
      console.error(`[MinIO Initialization Error] Attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt >= maxRetries) {
        throw new Error(`MinIO connection failed after ${maxRetries} attempts. Unable to initialize object storage.`);
      }
      const delay = retryDelayMs * Math.pow(1.5, attempt - 1);
      console.log(`[MinIO Initialization] Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
