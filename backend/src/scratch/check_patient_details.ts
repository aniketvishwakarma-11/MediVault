import { query } from '../config/db';

async function check() {
  const p = await query(`SELECT id, user_id, blood_group, date_of_birth, vitals_json, allergies_json, chronic_conditions_json, emergency_contact_name, emergency_contact_phone FROM public.patients WHERE id = 'aa15ef2b-e4d8-406f-8d99-98d277c425f0'`);
  console.log('PATIENT ROW:', JSON.stringify(p.rows, null, 2));
  process.exit(0);
}

check();
