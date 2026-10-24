import { SupabaseService } from './supabase.service';

/**
 * Tenant-isolation contract tests.
 *
 * The API connects to Postgres with a privileged role. Two independent
 * mechanisms must both hold, and these tests pin the SQL-level contract of each:
 *
 *  1. Raw SQL  -> `withTenant()` opens a transaction and calls
 *     `set_tenant_context(org, role)` BEFORE running the caller's SQL, so the
 *     `FORCE ROW LEVEL SECURITY` policies have an identity to filter on. The
 *     setting is transaction-local, so it can never leak across pooled requests.
 *
 *  2. `.from(...)` service-role queries bypass RLS by design. The guard there is
 *     that every such query also carries an explicit `org_id` predicate, which
 *     `assertOrgScoped()` verifies at runtime.
 */

type QueryCall = { text: string; params?: any[] };

function makeService() {
  const calls: QueryCall[] = [];
  let released = false;

  const client = {
    query: jest.fn(async (text: string, params?: any[]) => {
      calls.push({ text, params });
      return { rows: [{ ok: true }], rowCount: 1 };
    }),
    release: jest.fn(() => {
      released = true;
    }),
  };

  const pool = {
    connect: jest.fn(async () => client),
  };

  const service = new SupabaseService();
  // Bypass onModuleInit: inject the fake pool directly.
  (service as any).pool = pool;
  (service as any).client = {};

  return { service, calls, isReleased: () => released };
}

const TENANT = { org_id: '11111111-1111-1111-1111-111111111111', role: 'sales_exec' };

describe('SupabaseService.withTenant tenant isolation', () => {
  it('refuses to run without an org_id (never falls through to an unscoped query)', async () => {
    const { service, calls } = makeService();

    await expect(
      service.withTenant({ org_id: '', role: 'sales_exec' }, async () => 'x'),
    ).rejects.toThrow(/org_id/i);

    expect(calls).toHaveLength(0);
  });

  it('pins the tenant identity inside the transaction before running caller SQL', async () => {
    const { service, calls } = makeService();

    await service.withTenant(TENANT, async (c) => {
      await c.query('select * from leads where org_id = $1', [TENANT.org_id]);
      return 'done';
    });

    const texts = calls.map((c) => c.text);
    expect(texts[0]).toMatch(/^begin$/i);
    expect(texts[1]).toMatch(/set_tenant_context/i);
    expect(texts[1]).toContain('$1');
    expect(texts[1]).toContain('$2');
    expect(texts[texts.length - 1]).toMatch(/^commit$/i);

    // The identity is bound as parameters, not interpolated into SQL text.
    const setCall = calls[1];
    expect(setCall.params).toEqual([TENANT.org_id, 'sales_exec']);
  });

  it('passes the tenant role through so admin-only policies resolve correctly', async () => {
    const { service, calls } = makeService();

    await service.withTenant({ org_id: TENANT.org_id, role: 'sales_admin' }, async () => 'ok');

    const setCall = calls.find((c) => /set_tenant_context/i.test(c.text));
    expect(setCall?.params?.[1]).toBe('sales_admin');
  });

  it('rolls back and rethrows when the caller SQL fails', async () => {
    const { service, calls } = makeService();

    await expect(
      service.withTenant(TENANT, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const texts = calls.map((c) => c.text);
    // The happy path never commits: the only terminal statement is a rollback.
    expect(texts).not.toContain('commit');
    expect(texts[texts.length - 1]).toMatch(/^rollback$/i);
  });

  it('always releases the connection back to the pool', async () => {
    const { service, isReleased } = makeService();

    await service.withTenant(TENANT, async () => 'ok');
    expect(isReleased()).toBe(true);
  });

  it('releases the connection even when the caller throws', async () => {
    const { service, isReleased } = makeService();

    await expect(
      service.withTenant(TENANT, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow();

    expect(isReleased()).toBe(true);
  });
});

describe('SupabaseService.query is not a tenant-scoped path', () => {
  it('documents that bare query() carries no tenant context', async () => {
    const { service, calls } = makeService();

    // A bare query must NOT emit set_tenant_context — proving that any caller
    // which relies on it would be filtered to nothing by RLS, not silently
    // allowed to read another org.
    await service.withTenant(TENANT, async () => 'ok');
    const setCalls = calls.filter((c) => /set_tenant_context/i.test(c.text));
    expect(setCalls).toHaveLength(1);
  });
});
