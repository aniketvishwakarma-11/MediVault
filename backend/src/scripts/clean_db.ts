import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * MediVault Database Cleanup Utility
 * Usage:
 *   npx tsx src/scripts/clean_db.ts --all       (Full wipe of all application data)
 *   npx tsx src/scripts/clean_db.ts --reports   (Purge medical reports & timeline events)
 *   npx tsx src/scripts/clean_db.ts --logs      (Purge audit logs & consent requests)
 *   npx tsx src/scripts/clean_db.ts --orphans   (Purge orphaned records)
 */
async function cleanDatabase() {
  const mode = process.argv[2] || '--orphans';
  const client = await pool.connect();

  console.log(`\n==================================================`);
  console.log(`  MediVault Database Cleanup Utility Mode: ${mode}`);
  console.log(`==================================================\n`);

  try {
    await client.query('BEGIN');

    if (mode === '--all' || mode === '--purge-everything') {
      console.log('⚠️ [WARNING] Performing full database truncate cascading down all tables...');

      await client.query(`
        TRUNCATE TABLE 
          public.audit_logs,
          public.consent_requests,
          public.timeline_events,
          public.prescriptions,
          public.medical_reports,
          public.hospitals,
          public.doctors,
          public.patients,
          public.profiles
        RESTART IDENTITY CASCADE;
      `);

      console.log('✅ Full database truncation completed successfully.');
    } else if (mode === '--reports') {
      console.log('🧹 Cleaning medical reports, prescriptions, and timeline events...');

      const res1 = await client.query(`DELETE FROM public.timeline_events;`);
      const res2 = await client.query(`DELETE FROM public.prescriptions;`);
      const res3 = await client.query(`DELETE FROM public.medical_reports;`);

      console.log(`✅ Removed ${res1.rowCount} timeline events, ${res2.rowCount} prescriptions, ${res3.rowCount} medical reports.`);
    } else if (mode === '--logs') {
      console.log('🧹 Purging audit logs & expired/pending consent requests...');

      const res1 = await client.query(`DELETE FROM public.audit_logs;`);
      const res2 = await client.query(`DELETE FROM public.consent_requests;`);

      console.log(`✅ Removed ${res1.rowCount} audit logs and ${res2.rowCount} consent requests.`);
    } else if (mode === '--orphans') {
      console.log('🔍 Auditing and purging orphaned records...');

      // 1. Reports referencing non-existent patients
      const oReports = await client.query(`
        DELETE FROM public.medical_reports 
        WHERE patient_id NOT IN (SELECT id FROM public.patients);
      `);

      // 2. Timeline events referencing non-existent patients or deleted reports
      const oTimeline = await client.query(`
        DELETE FROM public.timeline_events 
        WHERE patient_id NOT IN (SELECT id FROM public.patients)
           OR (report_id IS NOT NULL AND report_id NOT IN (SELECT id FROM public.medical_reports));
      `);

      // 3. Prescriptions referencing non-existent patients
      const oPrescriptions = await client.query(`
        DELETE FROM public.prescriptions 
        WHERE patient_id NOT IN (SELECT id FROM public.patients);
      `);

      // 4. Consent requests referencing non-existent patients
      const oConsent = await client.query(`
        DELETE FROM public.consent_requests 
        WHERE patient_id NOT IN (SELECT id FROM public.patients);
      `);

      console.log(`✅ Orphan Cleanup Results:`);
      console.log(`   - Orphaned Reports Purged: ${oReports.rowCount}`);
      console.log(`   - Orphaned Timeline Events Purged: ${oTimeline.rowCount}`);
      console.log(`   - Orphaned Prescriptions Purged: ${oPrescriptions.rowCount}`);
      console.log(`   - Orphaned Consent Requests Purged: ${oConsent.rowCount}`);
    } else {
      console.log(`Unknown mode "${mode}". Allowed options: --all, --reports, --logs, --orphans`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Database cleanup transaction committed successfully.\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database cleanup failed! Transaction rolled back.', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDatabase();
