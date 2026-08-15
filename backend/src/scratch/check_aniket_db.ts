import { query } from '../config/db';

async function checkAniketRecords() {
  console.log('=== Checking Aniket Vishwakarma DB Records ===\n');

  try {
    // 1. Check users_profile and patients
    const userRes = await query(`
      SELECT u.id as user_id, u.full_name, u.email, p.id as patient_id
      FROM public.users_profile u
      LEFT JOIN public.patients p ON p.user_id = u.id
      WHERE u.full_name ILIKE '%Aniket%' OR u.email ILIKE '%aniket%';
    `);
    console.log('Users/Patients matching Aniket:', JSON.stringify(userRes.rows, null, 2));

    // 2. Check all documents in DB
    const docsRes = await query(`
      SELECT id, patient_id, uploader_id, document_name, created_at
      FROM public.documents
      ORDER BY created_at DESC
      LIMIT 20;
    `);
    console.log('\nLatest Documents in DB:', JSON.stringify(docsRes.rows, null, 2));

    // 3. Check all patients in DB
    const allPatients = await query(`
      SELECT p.id as patient_id, p.user_id, u.full_name, u.email
      FROM public.patients p
      JOIN public.users_profile u ON p.user_id = u.id;
    `);
    console.log('\nAll Patients in DB:', JSON.stringify(allPatients.rows, null, 2));

    // 4. Check emergency_credentials
    const credsRes = await query(`
      SELECT * FROM public.emergency_credentials ORDER BY created_at DESC LIMIT 10;
    `);
    console.log('\nLatest Emergency Credentials in DB:', JSON.stringify(credsRes.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error checking DB:', err);
    process.exit(1);
  }
}

checkAniketRecords();
