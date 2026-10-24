import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseService } from '../../db/supabase.service';

/**
 * Tests the demo-token backdoor gating and the impersonation marker handling.
 * The Supabase service is stubbed so these run without a live project.
 */

function contextWithToken(token?: string): ExecutionContext {
  // A single stable request object: the guard mutates `req.user`, and the test
  // asserts on that same object afterwards.
  const request: any = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(opts: { getUser?: any; profile?: any } = {}) {
  const client = {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue(opts.getUser ?? { data: { user: null }, error: { message: 'bad' } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: opts.profile ?? null }),
        }),
      }),
    }),
  };
  const supabase = { client } as unknown as SupabaseService;
  return new JwtAuthGuard(supabase);
}

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('JwtAuthGuard demo-token backdoor gating', () => {
  it('rejects a demo token when ENABLE_DEMO_AUTH is not set', async () => {
    delete process.env.ENABLE_DEMO_AUTH;
    process.env.NODE_ENV = 'development';
    const guard = makeGuard();

    await expect(guard.canActivate(contextWithToken('demo-token-super_admin'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a demo token in production even when ENABLE_DEMO_AUTH=true', async () => {
    process.env.ENABLE_DEMO_AUTH = 'true';
    process.env.NODE_ENV = 'production';
    const guard = makeGuard();

    await expect(guard.canActivate(contextWithToken('demo-token-super_admin'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts an allow-listed demo token in development when opted in', async () => {
    process.env.ENABLE_DEMO_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    const guard = makeGuard();
    const ctx = contextWithToken('demo-token-sales_exec');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const req = ctx.switchToHttp().getRequest();
    expect(req.user.role).toBe('sales_exec');
    expect(req.user.id).toBe('22222222-2222-2222-2222-222222222225');
  });

  it('rejects a demo token with an unknown role', async () => {
    process.env.ENABLE_DEMO_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    const guard = makeGuard();

    await expect(guard.canActivate(contextWithToken('demo-token-hacker'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('JwtAuthGuard real-token handling', () => {
  it('rejects a request with no Authorization header', async () => {
    const guard = makeGuard();
    await expect(guard.canActivate(contextWithToken(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a deactivated profile', async () => {
    const guard = makeGuard({
      getUser: { data: { user: { id: 'u1', email: 'x@y.com' } }, error: null },
      profile: { id: 'u1', org_id: 'org-1', role: 'sales_exec', is_active: false },
    });

    await expect(guard.canActivate(contextWithToken('real-token'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('surfaces the _impersonatedBy marker from app_metadata', async () => {
    const guard = makeGuard({
      getUser: {
        data: {
          user: {
            id: 'u1',
            email: 'x@y.com',
            app_metadata: {
              _impersonatedBy: { id: 'admin-1', role: 'super_admin', full_name: 'Admin' },
            },
          },
        },
        error: null,
      },
      profile: {
        id: 'u1',
        org_id: 'org-1',
        role: 'sales_exec',
        is_active: true,
        full_name: 'Exec',
      },
    });

    const ctx = contextWithToken('real-token');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    const req = ctx.switchToHttp().getRequest();
    expect(req.user.impersonator).toEqual({
      id: 'admin-1',
      role: 'super_admin',
      full_name: 'Admin',
    });
  });

  it('leaves impersonator null for a normal session', async () => {
    const guard = makeGuard({
      getUser: {
        data: { user: { id: 'u1', email: 'x@y.com', app_metadata: {} } },
        error: null,
      },
      profile: { id: 'u1', org_id: 'org-1', role: 'sales_exec', is_active: true },
    });

    const ctx = contextWithToken('real-token');
    await guard.canActivate(ctx);
    expect(ctx.switchToHttp().getRequest().user.impersonator).toBeNull();
  });
});
