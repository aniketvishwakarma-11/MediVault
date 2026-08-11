import { query } from '../config/db';

async function printAiJson() {
  try {
    const res = await query(`SELECT * FROM public.ai_analyses WHERE document_id = '83f0c98f-6c84-4407-9753-7172f98c05e9';`);
    console.log("Full AI Analysis Rows:");
    for (const row of res.rows) {
      console.log("Row ID:", row.id, "| is_active:", row.is_active);
      console.log("raw_response_json:", JSON.stringify(row.raw_response_json, null, 2));
    }
  } catch (err) {
    console.error("Print error:", err);
  }
  process.exit(0);
}

printAiJson();
