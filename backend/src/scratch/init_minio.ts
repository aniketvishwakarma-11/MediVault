import { initializeMinioBucket } from '../config/minio';

async function main() {
  console.log("Initializing MinIO buckets...");
  await initializeMinioBucket(5, 1000);
  console.log("Bucket initialization script finished.");
  process.exit(0);
}

main();
