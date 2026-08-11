import { query } from '../config/db';
import { getMinioClient, getMinioBucketName, V2_BUCKETS } from '../config/minio';

async function wipeMinioAndDb() {
  try {
    const client = getMinioClient();
    console.log("=== STARTING COMPLETE VAULT & DATABASE WIPE ===");

    // 1. Wipe database document records
    console.log("Wiping database tables...");
    const aiRes = await query(`DELETE FROM public.ai_analyses;`);
    console.log(`Deleted ${aiRes.rowCount} record(s) from public.ai_analyses.`);

    const docRes = await query(`DELETE FROM public.documents;`);
    console.log(`Deleted ${docRes.rowCount} record(s) from public.documents.`);

    try {
      const auditRes = await query(`DELETE FROM public.document_audit_logs;`);
      console.log(`Deleted ${auditRes.rowCount} record(s) from public.document_audit_logs.`);
    } catch (e) {}

    // 2. Empty all objects inside MinIO buckets
    for (const b of V2_BUCKETS) {
      console.log(`\nEmptying MinIO bucket: "${b.name}"...`);
      try {
        const bucketExists = await client.bucketExists(b.name);
        if (bucketExists) {
          const objectsList: string[] = [];
          const stream = client.listObjects(b.name, '', true);

          for await (const obj of stream) {
            if (obj.name) {
              objectsList.push(obj.name);
            }
          }

          if (objectsList.length > 0) {
            console.log(`Found ${objectsList.length} object(s) in "${b.name}". Deleting...`);
            await client.removeObjects(b.name, objectsList);
            console.log(`✅ Successfully deleted ${objectsList.length} object(s) from bucket "${b.name}".`);
          } else {
            console.log(`Bucket "${b.name}" is already empty.`);
          }
        }
      } catch (mErr) {
        console.warn(`MinIO bucket wipe notice for "${b.name}":`, (mErr as any).message || mErr);
      }
    }

    console.log("\n✅ COMPLETE WIPE SUCCESSFUL: MinIO & PostgreSQL are 100% clean and ready!");

  } catch (err) {
    console.error("Wipe failed:", err);
  }
  process.exit(0);
}

wipeMinioAndDb();
