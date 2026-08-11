import { query } from '../config/db';

async function checkAiTable() {
  try {
    const res = await query(`SELECT * FROM public.ai_analyses ORDER BY created_at DESC LIMIT 5;`);
    console.log(`Found ${res.rows.length} row(s) in public.ai_analyses:`);
    for (const r of res.rows) {
      console.log(`\nDocID: ${r.document_id} | Model: ${r.model_name}`);
      console.log("Raw JSON type:", typeof r.raw_response_json);
      console.log("Raw JSON snippet:", String(r.raw_response_json).slice(0, 200));
    }
  } catch (err) {
    console.error("AI check error:", err);
  }
  process.exit(0);
}

checkAiTable();
