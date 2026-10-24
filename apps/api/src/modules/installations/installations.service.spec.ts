import { NotFoundException } from '@nestjs/common';
import { InstallationsService } from './installations.service';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

/**
 * Tenant-isolation tests for the newer services. Every read/write must carry
 * `org_id = user.org_id`, so a caller from another organisation gets a 404
 * (never a 403 that would confirm the record exists) and a request that targets
 * a foreign lead is rejected before any write happens.
 */

function makeService(lead: any) {
  const inserted: any[] = [];
  const client = {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'leads') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: lead, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        insert: jest.fn((row: any) => {
          inserted.push(row);
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'inst-1', ...row }, error: null }),
            }),
          };
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'inst-1' }, error: null }),
            }),
          }),
        }),
      };
    }),
  };

  const service = new InstallationsService({ client } as unknown as SupabaseService);
  return { service, inserted, client };
}

const user: AuthUser = {
  id: 'user-1',
  email: 'installer@kyrossolar.com',
  org_id: 'org-1',
  role: 'installer',
};

describe('InstallationsService tenant isolation', () => {
  it('rejects a milestone for a lead that is not in the caller org (404, not 403)', async () => {
    // The org-scoped lead lookup returns null for a foreign lead.
    const { service } = makeService(null);

    await expect(
      service.upsert({ lead_id: 'foreign-lead', milestone: 'material_dispatch' }, user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stamps the caller org on every inserted milestone', async () => {
    const { service, inserted } = makeService({
      id: 'lead-1',
      org_id: 'org-1',
      deleted_at: null,
    });

    await service.upsert({ lead_id: 'lead-1', milestone: 'material_dispatch' }, user);

    expect(inserted).toHaveLength(1);
    expect(inserted[0].org_id).toBe('org-1');
    expect(inserted[0].lead_id).toBe('lead-1');
  });
});
