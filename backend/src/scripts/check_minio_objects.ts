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

async function main() {
  try {
    console.log('--- CONNECTING TO MINIO OBJECT STORAGE ---');
    console.log(`Endpoint: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
    
    const buckets = await minioClient.listBuckets();
    console.log(`\nFound ${buckets.length} Buckets in MinIO:`);
    buckets.forEach(b => console.log(`  - Bucket: "${b.name}" (Created: ${b.creationDate})`));

    for (const bucket of buckets) {
      console.log(`\n========================================`);
      console.log(`LISTING OBJECTS IN BUCKET: "${bucket.name}"`);
      console.log(`========================================`);

      const stream = minioClient.listObjectsV2(bucket.name, '', true);
      let objectCount = 0;

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (obj) => {
          objectCount++;
          console.log(` [${objectCount}] Key: "${obj.name}"`);
          console.log(`     Size: ${obj.size} bytes | Last Modified: ${obj.lastModified} | ETag: ${obj.etag}`);
        });
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });

      if (objectCount === 0) {
        console.log(`  (Bucket "${bucket.name}" is currently empty)`);
      }
    }
  } catch (err: any) {
    console.error('Error auditing MinIO:', err.message || err);
  }
}

main();
