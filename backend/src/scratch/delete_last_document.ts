import { query } from '../config/db';
import fs from 'fs';
import path from 'path';

async function main() {
  try {
    const res = await query(`SELECT id, document_name, storage_path, created_at FROM public.documents ORDER BY created_at DESC LIMIT 5;`);
    console.log("Recent Documents in DB:", res.rows);

    if (res.rows.length > 0) {
      const lastDoc = res.rows[0];
      console.log(`Deleting latest document: ${lastDoc.id} (${lastDoc.document_name})`);

      // Delete associated AI analyses & audit logs first for FK integrity
      await query(`DELETE FROM public.ai_analyses WHERE document_id = $1;`, [lastDoc.id]);
      await query(`DELETE FROM public.documents WHERE id = $1;`, [lastDoc.id]);
      console.log(`Successfully deleted document ${lastDoc.id} from public.documents database!`);

      // Clean up local disk file if present
      if (lastDoc.storage_path) {
        const localFilePath = path.join(process.cwd(), 'uploads', lastDoc.storage_path);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
          console.log(`Removed local disk file at: ${localFilePath}`);
        }
      }
    } else {
      console.log("No documents found in database.");
    }
  } catch (err) {
    console.error("Error executing delete script:", err);
  }
  process.exit(0);
}

main();
