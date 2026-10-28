import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load root and local .env files
dotenv.config();

async function runMigrations() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:54322/postgres';

  const isRemote =
    databaseUrl.includes('supabase.co') ||
    databaseUrl.includes('render.com') ||
    process.env.NODE_ENV === 'production';

  console.log('🔄 [Database Migration] Connecting to PostgreSQL database...');
  console.log(`ℹ️  Target Host: ${databaseUrl.replace(/:[^:@]*@/, ':****@')}`);
  console.log(`ℹ️  SSL Mode: ${isRemote ? 'Enabled (rejectUnauthorized: false)' : 'Default'}`);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
  });

  try {
    const migrationPath = path.resolve(
      __dirname,
      '../../../../supabase/migrations/20261020000000_init_schema.sql'
    );

    // Fallback relative resolution
    const candidatePaths = [
      migrationPath,
      path.resolve(process.cwd(), 'supabase/migrations/20261020000000_init_schema.sql'),
      path.resolve(__dirname, '../../../supabase/migrations/20261020000000_init_schema.sql'),
    ];

    const resolvedPath = candidatePaths.find(p => fs.existsSync(p));

    if (!resolvedPath) {
      throw new Error(`Migration SQL file not found in candidates: ${candidatePaths.join(', ')}`);
    }

    console.log(`📄 [Database Migration] Reading schema definitions from: ${resolvedPath}`);
    const sql = fs.readFileSync(resolvedPath, 'utf8');

    const client = await pool.connect();
    try {
      console.log('⚡ [Database Migration] Applying schema migrations...');
      await client.query("select set_config('app.bypass_rls', 'on', false)");
      await client.query(sql);

      // Verify created tables
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      const tables = res.rows.map(r => r.table_name);
      console.log(`✅ [Database Migration] Migrations applied successfully!`);
      console.log(`📊 Verified Public Tables (${tables.length}): ${tables.join(', ')}`);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('❌ [Database Migration] Failed to apply migrations:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
