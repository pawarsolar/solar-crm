import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

/**
 * Visibility rules under test:
 *  - super_admin / sales_admin see the whole org pipeline
 *  - a user with the `telecalling` grant sees the whole pool
 *  - everyone else sees only leads they own, created, or that belong to their team
 *  - cross-org access is always a 404
 */

const ORG = 'org-1';
const LEAD_OWNER = 'user-1';
const OTHER = 'user-2';

function makeService(opts: {
  lead?: any;
  telecalling?: boolean;
} = {}) {
  const client = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: opts.lead ?? null, error: null }),
        }),
      }),
    }),
  };
  const supabase = { client } as unknown as SupabaseService;
  const featureGuard = {
    resolveFeatureFlag: jest.fn().mockResolvedValue(!!opts.telecalling),
  } as unknown as FeatureGuard;

  return new LeadsService(supabase, featureGuard);
}

const execUser: AuthUser = {
  id: LEAD_OWNER,
  email: 'exec@kyrossolar.com',
  org_id: ORG,
  role: 'sales_exec',
};

const otherUser: AuthUser = {
  id: OTHER,
  email: 'other@kyrossolar.com',
  org_id: ORG,
  role: 'sales_exec',
};

const adminUser: AuthUser = {
  id: 'admin-1',
  email: 'admin@kyrossolar.com',
  org_id: ORG,
  role: 'sales_admin',
};

describe('LeadsService assertVisible (ownership scoping)', () => {
  it('allows an admin to read any lead in the org', async () => {
    const service = makeService({
      lead: { id: 'l1', org_id: ORG, owner_id: OTHER, created_by: OTHER, team_id: null, stage: 'NEW' },
    });

    await expect(service['assertVisible']('l1', adminUser)).resolves.toBeDefined();
  });

  it('allows the owner to read their own lead', async () => {
    const service = makeService({
      lead: { id: 'l1', org_id: ORG, owner_id: LEAD_OWNER, created_by: OTHER, team_id: null, stage: 'NEW' },
    });

    await expect(service['assertVisible']('l1', execUser)).resolves.toBeDefined();
  });

  it('denies a non-owner without telecalling', async () => {
    const service = makeService({
      lead: { id: 'l1', org_id: ORG, owner_id: OTHER, created_by: OTHER, team_id: null, stage: 'NEW' },
      telecalling: false,
    });

    await expect(service['assertVisible']('l1', execUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows a non-owner when the telecalling grant is present', async () => {
    const service = makeService({
      lead: { id: 'l1', org_id: ORG, owner_id: OTHER, created_by: OTHER, team_id: null, stage: 'NEW' },
      telecalling: true,
    });

    await expect(service['assertVisible']('l1', execUser)).resolves.toBeDefined();
  });

  it('allows a teammate to read a lead assigned to their team', async () => {
    const service = makeService({
      lead: { id: 'l1', org_id: ORG, owner_id: OTHER, created_by: OTHER, team_id: 'team-9', stage: 'NEW' },
      telecalling: false,
    });

    const teammate: AuthUser = { ...execUser, team_id: 'team-9' };
    await expect(service['assertVisible']('l1', teammate)).resolves.toBeDefined();
  });

  it('returns 404 (not 403) for a lead in another organization', async () => {
    const service = makeService({
      lead: { id: 'l1', org_id: 'other-org', owner_id: LEAD_OWNER, created_by: LEAD_OWNER, stage: 'NEW' },
    });

    await expect(service['assertVisible']('l1', execUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns 404 when the lead does not exist', async () => {
    const service = makeService({ lead: null });

    await expect(service['assertVisible']('missing', execUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('LeadsService visibilityFilter', () => {
  it('returns null (no filter) for admins', async () => {
    const service = makeService();
    await expect(service['visibilityFilter'](adminUser)).resolves.toBeNull();
  });

  it('returns null when telecalling is granted', async () => {
    const service = makeService({ telecalling: true });
    await expect(service['visibilityFilter'](execUser)).resolves.toBeNull();
  });

  it('scopes to owner-or-creator when no grant and no team', async () => {
    const service = makeService({ telecalling: false });
    const filter = await service['visibilityFilter'](execUser);

    expect(filter).toBe(`owner_id.eq.${LEAD_OWNER},created_by.eq.${LEAD_OWNER}`);
  });

  it('includes the team clause when the user has a team', async () => {
    const service = makeService({ telecalling: false });
    const filter = await service['visibilityFilter']({ ...execUser, team_id: 'team-9' });

    expect(filter).toContain('team_id.eq.team-9');
  });
});
