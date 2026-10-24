import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function resetDb() {
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ FATAL: Refusing to reset database in PRODUCTION environment.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  const pool = new Pool({ connectionString: databaseUrl });

  console.log('🔄 Resetting local database...');

  try {
    const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20261020000000_init_schema.sql');
    const seedPath = path.resolve(__dirname, '../../../supabase/seed.sql');

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('Applying schema migration...');
    const client = await pool.connect();
    try {
      // The migration creates the policies; the seed needs to bypass them.
      await client.query("select set_config('app.bypass_rls', 'on', false)");
      await client.query(migrationSql);

      console.log('Applying seed data...');
      await client.query(seedSql);
    } finally {
      client.release();
    }

    console.log('✨ Local database reset complete.');
  } catch (err) {
    console.error('Reset error:', err.message);
  } finally {
    await pool.end();
  }
}

resetDb();
