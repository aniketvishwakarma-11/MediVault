import { query } from '../config/db';

async function checkDbRecords() {
  try {
    console.log("=== CHECKING POSTGRESQL DOCUMENTS ===");
    const docs = await query(`SELECT * FROM public.documents ORDER BY created_at DESC LIMIT 10;`);
    console.log("Documents rows:", docs.rows);

    console.log("\n=== CHECKING POSTGRESQL PATIENTS ===");
    const patients = await query(`SELECT * FROM public.patients LIMIT 10;`);
    console.log("Patients rows:", patients.rows);

    console.log("\n=== CHECKING POSTGRESQL USERS PROFILE ===");
    const users = await query(`SELECT * FROM public.users_profile LIMIT 10;`);
    console.log("Users rows:", users.rows);
  } catch (err) {
    console.error("DB Check Error:", err);
  }
  process.exit(0);
}

checkDbRecords();
