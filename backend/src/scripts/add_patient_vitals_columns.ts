import { db } from '../config/db';

async function addPatientVitalsColumns() {
  console.log('Adding new columns (weight, height, allergies, chronic_conditions) to patients table...');
  try {
    await db.query(`ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS weight VARCHAR(50);`);
    await db.query(`ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS height VARCHAR(50);`);
    await db.query(`ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS allergies TEXT;`);
    await db.query(`ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS chronic_conditions TEXT;`);

    console.log('✓ Successfully added weight, height, allergies, chronic_conditions columns to patients table!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding columns to patients table:', err);
    process.exit(1);
  }
}

addPatientVitalsColumns();
