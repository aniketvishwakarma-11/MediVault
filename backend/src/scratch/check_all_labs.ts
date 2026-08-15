import { query } from '../config/db';

async function checkAllLabResults() {
  console.log('=== Checking All Lab Results in PostgreSQL ===\n');

  const labsRes = await query(`
    SELECT id, patient_id, test_name, value, status, reference_range, visit_date, created_at
    FROM public.lab_results
    ORDER BY created_at DESC;
  `);

  console.log('All public.lab_results rows count:', labsRes.rows.length);
  console.log(JSON.stringify(labsRes.rows, null, 2));

  const eventsWithLabs = await query(`
    SELECT id, patient_id, title, event_type, structured_data->'lab_results' as extracted_labs
    FROM public.clinical_events
    WHERE structured_data IS NOT NULL AND structured_data->'lab_results' IS NOT NULL;
  `);
  console.log('\nAll clinical_events with extracted_labs count:', eventsWithLabs.rows.length);
  console.log(JSON.stringify(eventsWithLabs.rows, null, 2));

  process.exit(0);
}

checkAllLabResults();
