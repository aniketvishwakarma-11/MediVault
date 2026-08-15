import { query } from '../config/db';

async function purgeSeedEmergencyData() {
  console.log('Cleaning up seed emergency data from PostgreSQL database...');

  try {
    // 1. Delete seed lab results (Blood Pressure 120/78 mmHg, Serum Creatinine 0.9 mg/dL, etc.)
    const seedLabsRes = await query(`
      DELETE FROM public.lab_results
      WHERE test_name IN ('Hemoglobin', 'Total WBC', 'Platelet Count', 'Fasting Blood Glucose', 'Serum Creatinine', 'Blood Pressure')
        AND value IN ('13.8 g/dL', '7,200 /cu mm', '240,000 /cu mm', '108 mg/dL', '0.9 mg/dL', '120/78 mmHg');
    `);
    console.log(`Deleted ${seedLabsRes.rowCount} seed dummy lab records from public.lab_results.`);

    // 2. Delete seed documents
    const seedDocsRes = await query(`
      DELETE FROM public.documents
      WHERE document_name LIKE '%Comprehensive Lipid & Cardiac Biomarker Panel%'
         OR document_name LIKE '%Pulmonary Chest Radiography%'
         OR document_name LIKE '%Cardiology Follow-Up Consultation Note%'
         OR document_name LIKE '%Immunization & Vaccine Certificate%';
    `);
    console.log(`Deleted ${seedDocsRes.rowCount} seed dummy documents from public.documents.`);

    // 3. Delete seed clinical events
    const seedEventsRes = await query(`
      DELETE FROM public.clinical_events
      WHERE title LIKE '%Diagnostic Blood Test & Lipid Screening%'
         OR title LIKE '%Digital Chest X-Ray Imaging%'
         OR title LIKE '%Annual Cardiology & Wellness Consultation%'
         OR title LIKE '%Seasonal Booster Immunization%';
    `);
    console.log(`Deleted ${seedEventsRes.rowCount} seed dummy clinical events from public.clinical_events.`);

    console.log('Emergency seed data purge completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error purging seed emergency data:', err);
    process.exit(1);
  }
}

purgeSeedEmergencyData();
