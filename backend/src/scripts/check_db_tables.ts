import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const auditData: any[] = [];

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;

      // Columns
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      // Count
      const countRes = await client.query(`SELECT COUNT(*) FROM public."${tableName}";`);
      const rowCount = parseInt(countRes.rows[0].count, 10);

      // Foreign Keys
      const fkRes = await client.query(`
        SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1;
      `, [tableName]);

      // Indexes
      const idxRes = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = $1;
      `, [tableName]);

      // Sample data
      let sampleData = [];
      if (rowCount > 0) {
        const sampleRes = await client.query(`SELECT * FROM public."${tableName}" LIMIT 3;`);
        sampleData = sampleRes.rows;
      }

      auditData.push({
        tableName,
        rowCount,
        columns: colsRes.rows,
        foreignKeys: fkRes.rows,
        indexes: idxRes.rows,
        sampleData
      });
    }

    fs.writeFileSync(
      path.join(__dirname, 'db_audit_dump.json'),
      JSON.stringify(auditData, null, 2)
    );
    console.log(`Successfully dumped full DB audit to db_audit_dump.json with ${auditData.length} tables!`);

  } catch (err) {
    console.error('Error auditing DB:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
