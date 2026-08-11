import { MinioStorageService } from '../storage/minioStorage';
import { getMinioClient, getMinioBucketName } from '../config/minio';

async function testUpload() {
  try {
    const client = getMinioClient();
    const bucket = getMinioBucketName();
    console.log(`Testing MinIO connection to bucket: "${bucket}"...`);

    const testKey = `test/doc-${Date.now()}.txt`;
    const buffer = Buffer.from("Hello MediVault MinIO Object Storage!", "utf-8");

    await MinioStorageService.uploadFile(testKey, buffer, "text/plain");
    console.log(`✅ SUCCESS: Uploaded test object "${testKey}" directly to MinIO bucket "${bucket}"!`);

    // Verify object exists in MinIO
    const stat = await client.statObject(bucket, testKey);
    console.log(`✅ VERIFIED in MinIO bucket: size = ${stat.size} bytes`);
  } catch (err: any) {
    console.error("❌ MinIO Upload Test Failed:", err);
  }
  process.exit(0);
}

testUpload();
