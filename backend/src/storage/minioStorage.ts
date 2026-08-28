import { getMinioClient, getMinioBucketName } from '../config/minio';
import { logger } from '../utils/logger';
import { query } from '../config/db';

const defaultExpirySeconds = parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '900', 10);

export class MinioStorageService {
  /**
   * Resolves a human-readable patient folder name: "Full Name - email@domain.com".
   * Queries users_profile / patients table, safely sanitizes invalid path characters,
   * and falls back gracefully to `P-{shortId}` if no record exists.
   */
  public static async resolvePatientFolder(
    patientIdentifier: string,
    uploaderId?: string
  ): Promise<string> {
    if (!patientIdentifier) return 'Unknown Patient';

    // If it's already human-readable (contains space or email @ while not starting with P-), sanitize and return
    if (patientIdentifier.includes(' ') || (patientIdentifier.includes('@') && !patientIdentifier.startsWith('P-'))) {
      return patientIdentifier.replace(/[/\\?%*:|"<>]/g, '-').trim();
    }

    try {
      const userRes = await query(
        `SELECT u.full_name, u.email FROM public.users_profile u
         LEFT JOIN public.patients p ON p.user_id = u.id
         WHERE u.id::text = $1 OR p.id::text = $1 OR u.id::text = $2 OR p.id::text = $2 LIMIT 1;`,
        [patientIdentifier, uploaderId || patientIdentifier]
      );

      if (userRes.rows.length > 0) {
        const rawName = userRes.rows[0].full_name?.trim() || userRes.rows[0].email?.split('@')[0] || 'Patient';
        const rawEmail = userRes.rows[0].email?.trim() || '';
        const cleanName = rawName.replace(/[/\\?%*:|"<>]/g, '-').trim();
        const cleanEmail = rawEmail.replace(/[/\\?%*:|"<>]/g, '-').trim();

        if (cleanName && cleanEmail) {
          return `${cleanName} - ${cleanEmail}`;
        } else if (cleanName) {
          return cleanName;
        } else if (cleanEmail) {
          return cleanEmail;
        }
      }
    } catch (err: any) {
      logger.warn(`[MinioStorageService] resolvePatientFolder notice for ${patientIdentifier}:`, err.message);
    }

    // Graceful fallback for non-profile test IDs or UUIDs
    return patientIdentifier.length === 36 && !patientIdentifier.includes(' ')
      ? `P-${patientIdentifier.slice(0, 8)}`
      : patientIdentifier.replace(/[/\\?%*:|"<>]/g, '-').trim();
  }

  /**
   * Copies an existing object within the MinIO bucket to a new key.
   */
  public static async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    const client = getMinioClient();
    const bucket = getMinioBucketName();
    await client.copyObject(bucket, destinationKey, `/${bucket}/${sourceKey}`);
    logger.info(`[MinIO Storage] Copied object from "${sourceKey}" to "${destinationKey}".`);
  }

  /**
   * Automatically migrates legacy `patients/P-xxxxxxxx/` objects in object storage
   * to human-readable `patients/Full Name - email@domain.com/` folders and updates DB.
   * Scans BOTH object storage directly AND database records.
   */
  public static async migrateLegacyPatientFolders(): Promise<{ migrated: number; errors: number; details: string[] }> {
    let migrated = 0;
    let errors = 0;
    const details: string[] = [];

    try {
      const client = getMinioClient();
      const bucket = getMinioBucketName();

      logger.info(`[Storage Migration] Scanning bucket "${bucket}" for legacy "patients/P-" objects...`);

      // 1. Scan storage bucket directly for any objects containing '/P-' or 'patients/P-'
      const bucketObjects: string[] = [];
      try {
        const stream = client.listObjects(bucket, '', true);
        for await (const item of stream) {
          if (item && item.name && (item.name.includes('/P-') || item.name.startsWith('patients/P-'))) {
            bucketObjects.push(item.name);
          }
        }
      } catch (listErr: any) {
        logger.warn(`[Storage Migration] Failed to list bucket objects:`, listErr.message);
      }

      logger.info(`[Storage Migration] Found ${bucketObjects.length} object(s) in bucket starting with "patients/P-".`);

      for (const oldKey of bucketObjects) {
        try {
          // Extract shortId e.g. "patients/P-d8a004e4/..." -> "d8a004e4"
          const match = oldKey.match(/^patients\/P-([a-zA-Z0-9_-]+)\//);
          if (!match || !match[1]) continue;
          const shortId = match[1];

          // Lookup user by shortId in users_profile or patients
          const userRes = await query(
            `SELECT u.full_name, u.email FROM public.users_profile u
             LEFT JOIN public.patients p ON p.user_id = u.id
             WHERE u.id::text LIKE $1 OR p.id::text LIKE $1 LIMIT 1`,
            [`${shortId}%`]
          );

          let humanFolder = `Patient-${shortId}`;
          if (userRes.rows.length > 0) {
            const rawName = userRes.rows[0].full_name?.trim() || userRes.rows[0].email?.split('@')[0] || 'Patient';
            const rawEmail = userRes.rows[0].email?.trim() || '';
            const cleanName = rawName.replace(/[/\\?%*:|"<>]/g, '-').trim();
            const cleanEmail = rawEmail.replace(/[/\\?%*:|"<>]/g, '-').trim();
            humanFolder = cleanName && cleanEmail ? `${cleanName} - ${cleanEmail}` : cleanName || cleanEmail;
          }

          const newKey = oldKey.replace(/^patients\/P-[^/]+\//, `patients/${humanFolder}/`);
          if (newKey === oldKey) continue;

          logger.info(`[Storage Migration] Moving "${oldKey}" -> "${newKey}"...`);

          // Resilient stream copy (works on ALL S3/B2 providers reliably)
          try {
            const objStream = await client.getObject(bucket, oldKey);
            const chunks: Buffer[] = [];
            for await (const chunk of objStream) {
              chunks.push(chunk as Buffer);
            }
            const buffer = Buffer.concat(chunks);
            await client.putObject(bucket, newKey, buffer, buffer.length);
            await client.removeObject(bucket, oldKey);
            logger.info(`[Storage Migration] Successfully moved "${oldKey}" -> "${newKey}".`);
            details.push(`Moved "${oldKey}" -> "${newKey}"`);
            migrated++;
          } catch (copyErr: any) {
            logger.error(`[Storage Migration Error] Failed to move "${oldKey}":`, copyErr.message);
            details.push(`Failed "${oldKey}": ${copyErr.message}`);
            errors++;
            continue;
          }

          // Update database record to ensure exact match
          try {
            await query(
              `UPDATE public.documents SET storage_path = $1 WHERE storage_path = $2 OR storage_path = $1`,
              [newKey, oldKey]
            );
          } catch (dbErr: any) {
            logger.warn(`[Storage Migration DB Notice]:`, dbErr.message);
          }
        } catch (itemErr: any) {
          logger.error(`[Storage Migration Error] Exception for object "${oldKey}":`, itemErr.message);
          errors++;
        }
      }

      logger.info(`[Storage Migration Finished] Migrated ${migrated} object(s). Errors: ${errors}`);
    } catch (err: any) {
      logger.warn('[Storage Migration Notice] Migration could not complete:', err.message);
    }

    return { migrated, errors, details };
  }

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
      const baseUrl = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || '5000'}`;
      return `${baseUrl}/documents/file-stream?key=${encodeURIComponent(storageKey)}`;
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
