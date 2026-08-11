import { query } from '../config/db';
import { getMinioClient, getMinioBucketName } from '../config/minio';
import fs from 'fs';
import path from 'path';

async function purgeAllAADocuments() {
  try {
    const client = getMinioClient();
    const bucket = getMinioBucketName();

    console.log("Searching for document 'AA' or any uploaded document in database...");
    const res = await query(`SELECT * FROM public.documents;`);
    console.log(`Found ${res.rows.length} total document(s) in PostgreSQL:`, res.rows);

    for (const doc of res.rows) {
      console.log(`\nDeleting Document ID: ${doc.id} (Name: "${doc.document_name}")`);

      // 1. Delete from PostgreSQL ai_analyses
      const aiRes = await query(`DELETE FROM public.ai_analyses WHERE document_id = $1 RETURNING id;`, [doc.id]);
      console.log(`Deleted ${aiRes.rowCount} AI analysis record(s) from public.ai_analyses.`);

      // 2. Delete from PostgreSQL documents table
      const docRes = await query(`DELETE FROM public.documents WHERE id = $1 RETURNING id;`, [doc.id]);
      console.log(`Deleted document record ${doc.id} from public.documents.`);

      // 3. Delete from MinIO storage if present
      if (doc.storage_path) {
        try {
          await client.removeObject(bucket, doc.storage_path);
          console.log(`Deleted MinIO object: "${doc.storage_path}" from bucket "${bucket}".`);
        } catch (mErr) {
          console.log(`MinIO object notice:`, (mErr as any).message || mErr);
        }

        // 4. Delete from local disk if present
        const localPath = path.join(process.cwd(), 'uploads', doc.storage_path);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log(`Deleted local disk file: ${localPath}`);
        }
      }
    }

    const checkRes = await query(`SELECT COUNT(*) FROM public.documents;`);
    console.log(`\nRemaining documents count in database: ${checkRes.rows[0].count}`);

  } catch (err) {
    console.error("Purge error:", err);
  }
  process.exit(0);
}

purgeAllAADocuments();
