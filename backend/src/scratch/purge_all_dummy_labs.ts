import { query } from '../config/db';

async function purgeAllDummyLabs() {
  console.log('=== Inspecting & Purging Dummy Labs in DB ===\n');

  try {
    // 1. Fetch all lab_results for Aniket or overall
    const allLabs = await query(`
      SELECT id, patient_id, test_name, value, status, reference_range, visit_date, created_at
      FROM public.lab_results;
    `);

    console.log(`Found ${allLabs.rows.length} total rows in public.lab_results table:`);
    console.log(JSON.stringify(allLabs.rows, null, 2));

    // 2. Delete dummy seed labs from lab_results table
    const deleteRes = await query(`
      DELETE FROM public.lab_results
      WHERE test_name IN ('Hemoglobin', 'Total WBC', 'Platelet Count', 'Fasting Blood Glucose', 'Serum Creatinine', 'Blood Pressure')
         OR value IN ('13.8 g/dL', '7,200 /cu mm', '240,000 /cu mm', '108 mg/dL', '0.9 mg/dL', '120/78 mmHg');
    `);
    console.log(`\nDeleted ${deleteRes.rowCount} dummy lab rows from public.lab_results.`);

    // 3. Re-check remaining rows in public.lab_results
    const remainingLabs = await query(`
      SELECT id, patient_id, test_name, value, status, reference_range, visit_date, created_at
      FROM public.lab_results;
    `);
    console.log(`\nRemaining rows in public.lab_results table (${remainingLabs.rows.length}):`);
    console.log(JSON.stringify(remainingLabs.rows, null, 2));

    console.log('\nDone!');
    process.exit(0);
  } catch (err) {
    console.error('Error purging dummy labs:', err);
    process.exit(1);
  }
}

purgeAllDummyLabs();
