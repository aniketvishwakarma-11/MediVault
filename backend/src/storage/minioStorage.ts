import { getMinioClient, getMinioBucketName } from '../config/minio';
import { logger } from '../utils/logger';

const defaultExpirySeconds = parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '900', 10);

export class MinioStorageService {
  /**
   * Generates production storage key path for a document under MediVault V2 hierarchy.
   * Path format: patients/{patientIdentifier}/documents/{category}/{docFolderIdentifier}/original.{ext}
   */
  public static getStorageKey(
    patientIdentifier: string,
    docFolderIdentifier: string,
    extension: string,
    category: string = 'General'
  ): string {
    const cleanExt = extension.replace('.', '').toLowerCase();
    const cleanCategory = category.replace(/[^a-zA-Z0-9_-]/g, '-');
    const folderName = patientIdentifier.length === 36 && !patientIdentifier.includes(' ')
      ? `P-${patientIdentifier.slice(0, 8)}`
      : patientIdentifier;
    return `patients/${folderName}/documents/${cleanCategory}/${docFolderIdentifier}/original.${cleanExt}`;
  }

  /**
   * Generates production storage key path for metadata JSON artifact under V2 hierarchy.
   */
  public static getMetadataKey(
    patientIdentifier: string,
    docFolderIdentifier: string,
    category: string = 'General'
  ): string {
    const cleanCategory = category.replace(/[^a-zA-Z0-9_-]/g, '-');
    const folderName = patientIdentifier.length === 36 && !patientIdentifier.includes(' ')
      ? `P-${patientIdentifier.slice(0, 8)}`
      : patientIdentifier;
    return `patients/${folderName}/documents/${cleanCategory}/${docFolderIdentifier}/metadata.json`;
  }

  /**
   * Uploads file buffer to MinIO storage under the configured hierarchy.
   */
  public static async uploadFile(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    const client = getMinioClient();
    const bucket = getMinioBucketName();

    try {
      // Ensure bucket exists on the fly
      try {
        const bucketExists = await client.bucketExists(bucket);
        if (!bucketExists) {
          logger.info(`[MinIO Storage] Bucket "${bucket}" missing. Creating on-the-fly...`);
          await client.makeBucket(bucket, 'us-east-1');
        }
      } catch (bErr) {}

      logger.info(`[MinIO Storage] Uploading object to bucket "${bucket}" with key "${storageKey}" (${buffer.length} bytes)...`);
      await client.putObject(bucket, storageKey, buffer, buffer.length, {
        'Content-Type': mimeType,
        ...metadata,
      });
      logger.info(`[MinIO Storage] Successfully uploaded object "${storageKey}".`);
    } catch (error) {
      logger.error(`[MinIO Storage Error] Failed to upload object "${storageKey}" to bucket "${bucket}":`, error);
      
      // Resilient Local Disk Storage Fallback
      try {
        const fs = await import('fs');
        const path = await import('path');
        const localPath = path.join(process.cwd(), 'uploads', storageKey);
        const localDir = path.dirname(localPath);
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        fs.writeFileSync(localPath, buffer);
        logger.info(`[MinIO Storage Fallback] Saved file to local filesystem fallback at "${localPath}".`);
        return;
      } catch (fallbackErr) {
        logger.error(`[MinIO Storage Fallback Error] Local disk fallback failed:`, fallbackErr);
      }

      throw new Error(`Object storage upload failed for key: ${storageKey}`);
    }
  }

  /**
   * Uploads metadata.json artifact alongside original document.
   */
  public static async uploadMetadataJSON(
    metadataKey: string,
    metadataObject: Record<string, any>
  ): Promise<void> {
    const buffer = Buffer.from(JSON.stringify(metadataObject, null, 2), 'utf-8');
    await this.uploadFile(metadataKey, buffer, 'application/json');
  }

  /**
   * Generates a temporary time-bounded pre-signed URL for document download.
   */
  public static async generatePreSignedUrl(
    storageKey: string,
    expirySeconds = defaultExpirySeconds,
    downloadFilename?: string
  ): Promise<string> {
    const client = getMinioClient();
    const bucket = getMinioBucketName();

    try {
      const respHeaders: Record<string, string> = {};
      if (downloadFilename) {
        respHeaders['response-content-disposition'] = `inline; filename="${downloadFilename}"`;
      }

      const signedUrl = await client.presignedGetObject(
        bucket,
        storageKey,
        expirySeconds,
        respHeaders
      );

      logger.info(`[MinIO Storage] Pre-signed download URL generated for key "${storageKey}" (Expires in ${expirySeconds}s).`);
      return signedUrl;
    } catch (error) {
      logger.warn(`[MinIO Storage Warning] Pre-signed URL fallback for key "${storageKey}":`, error);
      const port = process.env.PORT || '5000';
      return `http://localhost:${port}/documents/file-stream?key=${encodeURIComponent(storageKey)}`;
    }
  }

  /**
   * Retrieves readable stream of original document object from MinIO or local fallback.
   */
  public static async getObjectStream(storageKey: string): Promise<NodeJS.ReadableStream> {
    const fs = await import('fs');
    const path = await import('path');
    const localPath = path.join(process.cwd(), 'uploads', storageKey);

    if (fs.existsSync(localPath)) {
      logger.info(`[MinIO Storage Stream] Streaming file directly from local disk fallback "${localPath}".`);
      return fs.createReadStream(localPath);
    }

    const client = getMinioClient();
    const bucket = getMinioBucketName();

    try {
      return await client.getObject(bucket, storageKey);
    } catch (err) {
      if (fs.existsSync(localPath)) {
        return fs.createReadStream(localPath);
      }
      throw err;
    }
  }

  /**
   * Complete hard removal of document object, metadata JSON, and folder from MinIO & local fallback.
   */
  public static async deleteFile(storageKey: string): Promise<void> {
    const client = getMinioClient();
    const bucket = getMinioBucketName();

    try {
      // 1. Delete original file object
      await client.removeObject(bucket, storageKey);

      // 2. Delete metadata.json or all files inside folder prefix
      const folderPrefix = storageKey.substring(0, storageKey.lastIndexOf('/'));
      if (folderPrefix) {
        const stream = client.listObjects(bucket, folderPrefix, true);
        const toDelete: string[] = [];
        for await (const obj of stream) {
          if (obj.name) toDelete.push(obj.name);
        }
        if (toDelete.length > 0) {
          await client.removeObjects(bucket, toDelete);
        }
      }

      logger.info(`[MinIO Storage] Hard purged object(s) under "${folderPrefix || storageKey}" from bucket "${bucket}".`);
    } catch (err) {
      logger.warn(`[MinIO Storage Delete Notice]:`, (err as any).message || err);
    }

    // 3. Remove local disk fallback if present
    try {
      const fs = await import('fs');
      const path = await import('path');
      const localPath = path.join(process.cwd(), 'uploads', storageKey);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      const localFolder = path.dirname(localPath);
      if (fs.existsSync(localFolder)) {
        fs.rmSync(localFolder, { recursive: true, force: true });
      }
    } catch (lErr) {}
  }
}
