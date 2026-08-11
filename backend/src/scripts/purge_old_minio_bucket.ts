import { Client } from 'minio';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'medivault_minio_admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'medivault_minio_secret_key',
});

async function purgeLegacyBucket() {
  const legacyBucket = 'medical-records';
  try {
    const exists = await minioClient.bucketExists(legacyBucket);
    if (exists) {
      console.log(`Found legacy bucket "${legacyBucket}". Purging all objects inside...`);
      
      const stream = minioClient.listObjectsV2(legacyBucket, '', true);
      const objectsList: string[] = [];

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (obj) => { if (obj.name) objectsList.push(obj.name); });
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });

      if (objectsList.length > 0) {
        await minioClient.removeObjects(legacyBucket, objectsList);
        console.log(`Deleted ${objectsList.length} legacy objects from "${legacyBucket}".`);
      }

      await minioClient.removeBucket(legacyBucket);
      console.log(`✅ Successfully deleted legacy bucket "${legacyBucket}".`);
    } else {
      console.log(`Legacy bucket "${legacyBucket}" does not exist or has already been removed.`);
    }
  } catch (err: any) {
    console.error('Error purging legacy bucket:', err.message || err);
  }
}

purgeLegacyBucket();
