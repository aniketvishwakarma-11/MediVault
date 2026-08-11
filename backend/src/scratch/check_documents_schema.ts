import { query } from '../config/db';

async function checkSchema() {
  try {
    const res = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents' AND table_schema = 'public';
    `);
    console.log("Columns in public.documents table:", res.rows);
  } catch (err) {
    console.error("Error inspecting table schema:", err);
  }
  process.exit(0);
}

checkSchema();
