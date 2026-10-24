import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const ENTITY_TABLES: Record<string, string> = {
  lead: 'leads',
  survey: 'surveys',
  quotation: 'quotations',
  payment: 'payments',
};

@Injectable()
export class DeletionRequestsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(user: AuthUser, body: { entity: string; entity_id: string; reason: string }) {
    const table = ENTITY_TABLES[body.entity];
    if (!table) {
      throw new ConflictException(`Unsupported deletion entity '${body.entity}'`);
    }

    // Never open a request for a record the caller cannot see in their own org.
    const { data: target } = await this.supabaseService.client
      .from(table)
      .select('id, org_id')
      .eq('id', body.entity_id)
      .eq('org_id', user.org_id)
      .maybeSingle();

    if (!target) {
      throw new NotFoundException(
        `The ${body.entity} you are trying to delete was not found in your organization`,
      );
    }

    // Collapse duplicate open requests for the same record.
    const { data: existing } = await this.supabaseService.client
      .from('deletion_requests')
      .select('id')
      .eq('org_id', user.org_id)
      .eq('entity', body.entity)
      .eq('entity_id', body.entity_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id,
        status: 'pending',
        message: 'A deletion request for this record is already pending administrator approval',
      };
    }

    const { data, error } = await this.supabaseService.client
      .from('deletion_requests')
      .insert({
        org_id: user.org_id,
        entity: body.entity,
        entity_id: body.entity_id,
        reason: body.reason,
        requested_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new ConflictException(`Unable to submit deletion request: ${error.message}`);
    return data;
  }

  async findAll(user: AuthUser) {
    if (!['super_admin', 'sales_admin'].includes(user.role)) {
      throw new ForbiddenException('Only administrators can view deletion queues');
    }

    const { data } = await this.supabaseService.client
      .from('deletion_requests')
      .select('*, requester:profiles!requested_by(full_name, role)')
      .eq('org_id', user.org_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return data || [];
  }

  async decide(id: string, user: AuthUser, approved: boolean, note?: string) {
    if (!['super_admin', 'sales_admin'].includes(user.role)) {
      throw new ForbiddenException('Only administrators can approve or reject deletion requests');
    }

    const { data: request } = await this.supabaseService.client
      .from('deletion_requests')
      .select('*')
      .eq('id', id)
      .eq('org_id', user.org_id)
      .single();

    if (!request) throw new NotFoundException('Deletion request not found');

    const status = approved ? 'approved' : 'rejected';

    await this.supabaseService.client
      .from('deletion_requests')
      .update({
        status,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (approved && request.entity === 'lead') {
      // Execute soft-delete on lead
      await this.supabaseService.client
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', request.entity_id)
        .eq('org_id', user.org_id);
    }

    return { message: `Request has been ${status}`, id, status };
  }
}
