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

const V2_BUCKETS = [
  { name: 'medivault-documents', public: false, desc: 'Primary encrypted vault storage for health records & AI artifacts' },
  { name: 'medivault-public', public: true, desc: 'Public avatars, hospital logos, and emergency QR cards' },
  { name: 'medivault-temp', public: false, desc: '24-hour temporary staging buffer for incoming uploads' },
  { name: 'medivault-archives', public: false, desc: 'Cold storage bucket for document versions older than 365 days' },
];

async function buildMinioV2() {
  console.log('\n==================================================');
  console.log('📦 Executing MediVault V2 MinIO Storage Build');
  console.log('==================================================\n');

  try {
    for (const b of V2_BUCKETS) {
      const exists = await minioClient.bucketExists(b.name);
      if (!exists) {
        await minioClient.makeBucket(b.name, 'us-east-1');
        console.log(`✅ Created Bucket: "${b.name}" — ${b.desc}`);
      } else {
        console.log(`ℹ️ Bucket "${b.name}" already exists — ${b.desc}`);
      }

      // Configure Public Read policy for medivault-public bucket
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
        await minioClient.setBucketPolicy(b.name, JSON.stringify(publicPolicy));
        console.log(`  🔒 Set Policy: Public Read Access on "${b.name}"`);
      }
    }

    // Verify Active Buckets
    const activeBuckets = await minioClient.listBuckets();
    console.log(`\nVerified ${activeBuckets.length} Total MinIO Buckets Active:`);
    activeBuckets.forEach((b, idx) => {
      console.log(`  [${idx + 1}] "${b.name}" (Created: ${b.creationDate})`);
    });

    console.log('\n✅ PHASE 8 MINIO BUILD COMPLETE!\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error executing MinIO V2 build:', err.message || err);
    process.exit(1);
  }
}

buildMinioV2();
