import { query } from '../config/db';
import fs from 'fs';
import path from 'path';

async function runV2Migration() {
  console.log('\n==================================================');
  console.log('🚀 Executing MediVault V2 Greenfield Schema Build');
  console.log('==================================================\n');

  try {
    const sqlPath = path.join(__dirname, '../migrations/005_medivault_v2_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Executing 005_medivault_v2_schema.sql DDL script...');
    await query(sqlContent);

    console.log('✅ MediVault V2 PostgreSQL Schema Built Successfully!');

    // Verify created tables
    const tableRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`\nVerified ${tableRes.rows.length} Tables Active in Public Schema:`);
    tableRes.rows.forEach((row, idx) => {
      console.log(`  [${idx + 1}] public."${row.table_name}"`);
    });

    console.log('\n✅ PHASE 7 DATABASE BUILD COMPLETE!\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error executing V2 schema migration:', err.message || err);
    process.exit(1);
  }
}

runV2Migration();
