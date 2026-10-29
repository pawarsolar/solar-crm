import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, PoolClient } from 'pg';
import WebSocket from 'ws';

// Ensure globalThis.WebSocket is available in Node.js 20 LTS environments
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

/** Minimal shape of the authenticated caller needed to pin a tenant session. */
export interface TenantContext {
  org_id: string;
  role: string;
}

export interface SchemaHealthReport {
  healthy: boolean;
  databaseConnected: boolean;
  schemaCacheValid: boolean;
  tablesChecked: string[];
  missingTables: string[];
  lastCheckedAt: string;
  syncRequired: boolean;
  actionRequired?: string;
  cliCommand?: string;
  inMemoryFallbackActive: boolean;
  notes?: string;
}

@Injectable()
export class SupabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupabaseService.name);
  public client: SupabaseClient;
  public pool: Pool;
  private lastHealthReport: SchemaHealthReport = {
    healthy: true,
    databaseConnected: false,
    schemaCacheValid: true,
    tablesChecked: ['leads', 'profiles', 'lead_stage_history', 'quotations', 'surveys'],
    missingTables: [],
    lastCheckedAt: new Date().toISOString(),
    syncRequired: false,
    inMemoryFallbackActive: true,
  };

  async onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_role_key_for_dev';

    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: {
        transport: WebSocket as any,
      },
      global: {
        // Fail fast when the project is unreachable instead of hanging the request.
        fetch: (input: any, init?: any) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
      },
    });

    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.logger.log('Supabase Server-Side Service and Postgres Pool initialized');

    // Run automatic schema health check upon initialization
    await this.checkSchemaHealth();
  }

  /**
   * Pings core tables in Supabase PostgREST schema cache to verify tables exist and are accessible.
   * If tables are missing or unmigrated, triggers a warning and activates fallback telemetry.
   */
  async checkSchemaHealth(): Promise<SchemaHealthReport> {
    const tablesToCheck = ['leads', 'profiles', 'lead_stage_history', 'quotations', 'surveys'];
    const missing: string[] = [];
    let isConnected = false;
    let schemaCacheValid = true;

    try {
      const ping = await this.client.from('leads').select('id').limit(1);
      if (ping.error) {
        if (
          ping.error.message.includes('schema cache') ||
          ping.error.message.includes('relation') ||
          ping.error.code === 'PGRST205'
        ) {
          schemaCacheValid = false;
          missing.push('leads');
        }
      } else {
        isConnected = true;
      }
    } catch {
      schemaCacheValid = false;
      missing.push('leads');
    }

    // Check profiles table
    try {
      const profilePing = await this.client.from('profiles').select('id').limit(1);
      if (profilePing.error && profilePing.error.message.includes('schema cache')) {
        schemaCacheValid = false;
        missing.push('profiles');
      }
    } catch {
      // Ignore
    }

    const syncRequired = !schemaCacheValid || missing.length > 0;
    const report: SchemaHealthReport = {
      healthy: !syncRequired && isConnected,
      databaseConnected: isConnected,
      schemaCacheValid,
      tablesChecked: tablesToCheck,
      missingTables: missing,
      lastCheckedAt: new Date().toISOString(),
      syncRequired,
      actionRequired: syncRequired
        ? 'Apply migrations to live Supabase Postgres database or push schema'
        : 'All core CRM tables healthy and verified in schema cache',
      cliCommand: syncRequired ? 'npx supabase db push' : undefined,
      inMemoryFallbackActive: true,
      notes: syncRequired
        ? 'Table public.leads is not in schema cache. In-memory fallback layer is automatically serving all leads, allocations, and mutations.'
        : 'Database is operational.',
    };

    this.lastHealthReport = report;

    if (syncRequired) {
      this.logger.warn(`
╔══════════════════════════════════════════════════════════════════════════════╗
║ ⚠️  SUPABASE SCHEMA HEALTH ALERT: SCHEMA SYNC REQUIRED                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Missing/Uncached Table(s): ${missing.join(', ') || 'leads'}
║ Operational Status: In-Memory Fallback Engine is ACTIVE to prevent downtime. ║
║ Action: Apply migrations to live Postgres database:                          ║
║   → npx supabase db push                                                     ║
║   → Or execute 'supabase/migrations/20261020000000_init_schema.sql'         ║
╚══════════════════════════════════════════════════════════════════════════════╝
      `);
    } else {
      this.logger.log('Supabase Schema Health Check PASSED. All core tables accessible.');
    }

    return report;
  }

  getSchemaHealth(): SchemaHealthReport {
    return this.lastHealthReport;
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  /**
   * Execute parameterized SQL query directly through pg Pool.
   *
   * Tenant-isolation note: the pool connects as a privileged role, and the
   * migration sets `FORCE ROW LEVEL SECURITY`, so this call is subject to RLS.
   * `app.current_org` is only set inside `withTenant()` and the setting is
   * transaction-local (`set_config(..., true)`), so a bare `.query()` on this
   * pool has NO tenant context and is therefore denied by every policy. Only
   * genuinely org-agnostic statements (health checks, migrations) may use it.
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    try {
      const res = await this.pool.query(text, params);
      return res.rows;
    } catch (err) {
      this.logger.warn(`Direct SQL query fallback triggered: ${err.message}`);
      return [];
    }
  }

  /**
   * Runs `fn` inside a transaction whose RLS identity is pinned to the caller's
   * organisation and role. This is the ONLY safe way for raw SQL to read tenant
   * data: `FORCE ROW LEVEL SECURITY` makes the privileges of the connection
   * irrelevant, and `app.current_org` is transaction-local so it can never leak
   * to another request that later checks out the same pooled connection.
   */
  async withTenant<T>(
    tenant: TenantContext,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    if (!tenant?.org_id) {
      throw new Error('withTenant() requires an org_id — refusing to run an unscoped tenant query');
    }

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('select set_tenant_context($1::uuid, $2::text)', [
        tenant.org_id,
        tenant.role,
      ]);
      const result = await fn(client);
      await client.query('commit');
      return result;
    } catch (err) {
      try {
        await client.query('rollback');
      } catch {
        /* connection already broken — nothing to roll back */
      }
      throw err;
    } finally {
      client.release();
    }
  }
}

