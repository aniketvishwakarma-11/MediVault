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
 * Verifies if V2 buckets exist, creating them automatically if missing.
 * Implements graceful fallback resilience for development.
 */
export const initializeMinioBucket = async (maxRetries = 2, retryDelayMs = 1000): Promise<void> => {
  const client = getMinioClient();

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`[MinIO V2 Initialization] Verifying V2 buckets (Attempt ${attempt}/${maxRetries})...`);

      for (const b of V2_BUCKETS) {
        const bucketExists = await client.bucketExists(b.name);
        if (!bucketExists) {
          console.log(`[MinIO Initialization] Creating bucket "${b.name}"...`);
          await client.makeBucket(b.name, 'us-east-1');
        }

        if (b.public) {
          const publicPolicy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${b.name}/*`],
              },
            ],
          };
          try {
            await client.setBucketPolicy(b.name, JSON.stringify(publicPolicy));
          } catch (pErr) {}
        }
      }

      console.log('✅ [MinIO V2 Initialization] All 4 MinIO buckets ready.');
      return; // Success
    } catch (error: any) {
      console.warn(`[MinIO Note] Attempt ${attempt}/${maxRetries} - Could not connect to MinIO on ${MINIO_CONFIG.endPoint}:${MINIO_CONFIG.port}.`);
      if (attempt >= maxRetries) {
        console.warn('⚠️ MinIO is currently offline. Starting server with fallback mode. Run minio.exe or docker compose up -d to enable live object storage.');
        return; // Graceful non-blocking return for dev resilience
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};
