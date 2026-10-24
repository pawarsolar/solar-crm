import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard } from './feature.guard';
import { SupabaseService } from '../../db/supabase.service';

/**
 * Unit tests for the 3-tier feature resolution order and the fail-closed policy.
 * These run without a database: the Supabase client is stubbed per test.
 */

type Grant = { scope: string; scope_value: string; feature_key?: string; enabled: boolean };

function makeGuard(grants: Grant[] | null, error: any = null) {
  const queryBuilder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    then: undefined,
  };

  // `.eq()` is called twice (org, feature) then awaited -> return the resolved shape.
  const client = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: grants, error }),
        }),
      }),
    }),
  };

  const supabase = { client } as unknown as SupabaseService;
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  return { guard: new FeatureGuard(reflector, supabase), reflector };
}

function contextFor(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

const baseUser = {
  id: 'user-1',
  org_id: 'org-1',
  role: 'sales_exec',
  email: 'a@b.com',
};

describe('FeatureGuard feature resolution order', () => {
  it('user override wins over role default', async () => {
    const { guard } = makeGuard([
      { scope: 'role', scope_value: 'sales_exec', enabled: false },
      { scope: 'user', scope_value: 'user-1', enabled: true },
    ]);

    await expect(
      guard.resolveFeatureFlag('org-1', 'user-1', 'sales_exec', 'telecalling'),
    ).resolves.toBe(true);
  });

  it('user override can revoke a feature the role has', async () => {
    const { guard } = makeGuard([
      { scope: 'role', scope_value: 'sales_exec', enabled: true },
      { scope: 'user', scope_value: 'user-1', enabled: false },
    ]);

    await expect(
      guard.resolveFeatureFlag('org-1', 'user-1', 'sales_exec', 'payments'),
    ).resolves.toBe(false);
  });

  it('falls back to the role default when no user override exists', async () => {
    const { guard } = makeGuard([
      { scope: 'role', scope_value: 'sales_exec', enabled: true },
    ]);

    await expect(
      guard.resolveFeatureFlag('org-1', 'user-1', 'sales_exec', 'telecalling'),
    ).resolves.toBe(true);
  });

  it('falls back to the org default when no role grant exists', async () => {
    const { guard } = makeGuard([{ scope: 'org', scope_value: 'org-1', enabled: true }]);

    await expect(
      guard.resolveFeatureFlag('org-1', 'user-1', 'sales_exec', 'reports'),
    ).resolves.toBe(true);
  });
});

describe('FeatureGuard fail-closed policy (database unreachable)', () => {
  it('keeps baseline features open', async () => {
    const { guard } = makeGuard(null, { message: 'fetch failed' });

    await expect(
      guard.resolveFeatureFlag('org-1', 'user-1', 'sales_exec', 'leads'),
    ).resolves.toBe(true);
  });

  it('fails closed for non-baseline features', async () => {
    const { guard } = makeGuard(null, { message: 'fetch failed' });

    await expect(
      guard.resolveFeatureFlag('org-1', 'user-1', 'sales_exec', 'payments'),
    ).resolves.toBe(false);
  });

  it('fails closed for a non-baseline feature with no configured grants', async () => {
    const { guard } = makeGuard([]);

    await expect(
      guard.resolveFeatureFlag('org-1', 'user-1', 'sales_exec', 'installation'),
    ).resolves.toBe(false);
  });
});

describe('FeatureGuard canActivate', () => {
  it('returns true when no feature is required', async () => {
    const { guard, reflector } = makeGuard([]);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    await expect(guard.canActivate(contextFor(baseUser))).resolves.toBe(true);
  });

  it('lets super_admin bypass every feature lock', async () => {
    const { guard, reflector } = makeGuard([]);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('payments');

    const admin = { ...baseUser, role: 'super_admin' };
    await expect(guard.canActivate(contextFor(admin))).resolves.toBe(true);
  });

  it('throws ForbiddenException when a non-baseline feature is not granted', async () => {
    const { guard, reflector } = makeGuard([]);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('payments');

    await expect(guard.canActivate(contextFor(baseUser))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('does NOT bypass feature locks while impersonating a non-super-admin', async () => {
    const { guard, reflector } = makeGuard([]);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('payments');

    const impersonating = {
      ...baseUser,
      impersonator: { id: 'admin-1', role: 'super_admin' },
    };
    await expect(guard.canActivate(contextFor(impersonating))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
