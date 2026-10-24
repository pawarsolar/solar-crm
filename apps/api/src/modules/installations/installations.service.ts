import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  UpsertInstallationDto,
  UpdateInstallationStatusDto,
} from './dto/upsert-installation.dto';

@Injectable()
export class InstallationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /** An installation may only be filed against a live lead in the caller's org. */
  private async assertLeadInOrg(leadId: string, user: AuthUser) {
    const { data: lead } = await this.supabaseService.client
      .from('leads')
      .select('id, org_id, deleted_at')
      .eq('id', leadId)
      .eq('org_id', user.org_id)
      .maybeSingle();

    if (!lead) throw new NotFoundException(`Lead with ID ${leadId} not found`);
    if (lead.deleted_at) {
      throw new ConflictException('Cannot schedule installation work on a deleted lead');
    }
    return lead;
  }

  async upsert(dto: UpsertInstallationDto, user: AuthUser) {
    await this.assertLeadInOrg(dto.lead_id, user);

    const payload = {
      org_id: user.org_id,
      lead_id: dto.lead_id,
      milestone: dto.milestone,
      planned_on: dto.planned_on || null,
      done_on: dto.done_on || null,
      status: dto.status || 'pending',
      note: dto.note || null,
    };

    // One row per (lead, milestone): re-posting a milestone updates it rather
    // than duplicating the schedule.
    const { data: existing } = await this.supabaseService.client
      .from('installations')
      .select('id')
      .eq('org_id', user.org_id)
      .eq('lead_id', dto.lead_id)
      .eq('milestone', dto.milestone)
      .maybeSingle();

    const query = existing
      ? this.supabaseService.client.from('installations').update(payload).eq('id', existing.id)
      : this.supabaseService.client.from('installations').insert(payload);

    const { data, error } = await query.select().single();
    if (error) {
      throw new ConflictException(`Failed to save installation milestone: ${error.message}`);
    }

    // Completing every milestone advances the lead to COMMISSIONED.
    if (payload.status === 'completed') {
      await this.advanceLeadIfComplete(dto.lead_id, user);
    }

    return data;
  }

  async updateStatus(id: string, dto: UpdateInstallationStatusDto, user: AuthUser) {
    const { data: existing } = await this.supabaseService.client
      .from('installations')
      .select('id, lead_id')
      .eq('id', id)
      .eq('org_id', user.org_id)
      .maybeSingle();

    if (!existing) throw new NotFoundException(`Installation with ID ${id} not found`);

    const { data, error } = await this.supabaseService.client
      .from('installations')
      .update({
        status: dto.status,
        done_on:
          dto.done_on ||
          (dto.status === 'completed' ? new Date().toISOString().split('T')[0] : null),
      })
      .eq('id', id)
      .eq('org_id', user.org_id)
      .select()
      .single();

    if (error) throw new ConflictException(`Failed to update installation: ${error.message}`);

    if (dto.status === 'completed') {
      await this.advanceLeadIfComplete(existing.lead_id, user);
    }

    return data;
  }

  async findByLead(leadId: string, user: AuthUser) {
    const { data } = await this.supabaseService.client
      .from('installations')
      .select('*')
      .eq('lead_id', leadId)
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: true });

    const rows = data || [];
    const completed = rows.filter((r) => r.status === 'completed').length;

    return {
      installations: rows,
      summary: {
        total: rows.length,
        completed,
        progressPct: rows.length ? Math.round((completed / rows.length) * 100) : 0,
      },
    };
  }

  private async advanceLeadIfComplete(leadId: string, user: AuthUser) {
    const { data: pending } = await this.supabaseService.client
      .from('installations')
      .select('id')
      .eq('org_id', user.org_id)
      .eq('lead_id', leadId)
      .neq('status', 'completed')
      .limit(1);

    if (!pending || pending.length === 0) {
      await this.supabaseService.client
        .from('leads')
        .update({ stage: 'COMMISSIONED', updated_at: new Date().toISOString() })
        .eq('id', leadId)
        .eq('org_id', user.org_id);
    }
  }
}
