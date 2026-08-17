import { query } from '../config/db';

async function checkDetails() {
  const userId = 'e9aa7d47-fae5-422e-885e-1b3ca24b376a';

  console.log('--- Checking patient row for userId:', userId);
  const pat = await query(`SELECT * FROM public.patients WHERE user_id = $1`, [userId]);
  console.log('patient row:', JSON.stringify(pat.rows, null, 2));

  console.log('--- Checking doctor row for userId:', userId);
  const doc = await query(`SELECT * FROM public.doctors WHERE user_id = $1`, [userId]);
  console.log('doctor row:', JSON.stringify(doc.rows, null, 2));

  console.log('--- Checking all columns of patients table');
  const patCols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'patients'`);
  console.log('patients columns:', patCols.rows.map(r => r.column_name));

  console.log('--- Checking all columns of doctors table');
  const docCols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'doctors'`);
  console.log('doctors columns:', docCols.rows.map(r => r.column_name));

  process.exit(0);
}

checkDetails();
