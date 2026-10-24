import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function runSeed() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  const pool = new Pool({ connectionString: databaseUrl });

  console.log('🌱 Starting Solar EPC CRM Database Seeding...');

  try {
    const seedSqlPath = path.resolve(__dirname, '../../../supabase/seed.sql');
    if (!fs.existsSync(seedSqlPath)) {
      throw new Error(`Seed SQL file not found at ${seedSqlPath}`);
    }

    const sql = fs.readFileSync(seedSqlPath, 'utf8');

    // `FORCE ROW LEVEL SECURITY` applies to the owner too, so a seeding
    // connection must explicitly opt out of tenant policies.
    const client = await pool.connect();
    try {
      await client.query("select set_config('app.bypass_rls', 'on', false)");
      await client.query(sql);
    } finally {
      client.release();
    }

    console.log('✅ Seeding completed successfully! 200 leads, 6 roles, and pricing tables initialized.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
}

runSeed();
