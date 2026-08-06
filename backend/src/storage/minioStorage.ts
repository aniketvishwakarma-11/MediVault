import { getMinioClient, getMinioBucketName } from '../config/minio';
import { logger } from '../utils/logger';

const defaultExpirySeconds = parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '900', 10);

export class MinioStorageService {
  /**
   * Generates production storage key path for a document.
   * Path format: patients/{patientId}/{documentId}/original.{ext}
   */
  public static getStorageKey(patientId: string, documentId: string, extension: string): string {
    const cleanExt = extension.replace('.', '').toLowerCase();
    return `patients/${patientId}/${documentId}/original.${cleanExt}`;
  }

  /**
   * Generates production storage key path for metadata JSON artifact.
   * Path format: patients/{patientId}/{documentId}/metadata.json
   */
  public static getMetadataKey(patientId: string, documentId: string): string {
    return `patients/${patientId}/${documentId}/metadata.json`;
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
      logger.info(`[MinIO Storage] Uploading object to bucket "${bucket}" with key "${storageKey}" (${buffer.length} bytes)...`);
      await client.putObject(bucket, storageKey, buffer, buffer.length, {
        'Content-Type': mimeType,
        ...metadata,
      });
      logger.info(`[MinIO Storage] Successfully uploaded object "${storageKey}".`);
    } catch (error) {
      logger.error(`[MinIO Storage Error] Failed to upload object "${storageKey}":`, error);
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
      logger.error(`[MinIO Storage Error] Failed to generate pre-signed URL for key "${storageKey}":`, error);
      throw new Error('Failed to generate secure pre-signed download link.');
    }
  }

  /**
   * Soft delete cleanup / hard removal of document object from MinIO.
   */
  public static async deleteFile(storageKey: string): Promise<void> {
    const client = getMinioClient();
    const bucket = getMinioBucketName();

    try {
      await client.removeObject(bucket, storageKey);
      logger.info(`[MinIO Storage] Object "${storageKey}" deleted from bucket "${bucket}".`);
    } catch (error) {
      logger.error(`[MinIO Storage Error] Failed to delete object "${storageKey}":`, error);
      throw new Error(`Failed to remove object from storage: ${storageKey}`);
    }
  }
}
