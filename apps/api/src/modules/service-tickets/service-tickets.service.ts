import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateServiceTicketDto, UpdateServiceTicketDto } from './dto/service-ticket.dto';

@Injectable()
export class ServiceTicketsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(dto: CreateServiceTicketDto, user: AuthUser) {
    const { data: lead } = await this.supabaseService.client
      .from('leads')
      .select('id, org_id')
      .eq('id', dto.lead_id)
      .eq('org_id', user.org_id)
      .maybeSingle();

    if (!lead) throw new NotFoundException(`Lead with ID ${dto.lead_id} not found`);

    const { data, error } = await this.supabaseService.client
      .from('service_tickets')
      .insert({
        org_id: user.org_id,
        lead_id: dto.lead_id,
        subject: dto.subject,
        description: dto.description || null,
        priority: dto.priority || 'medium',
        assigned_to: dto.assigned_to || null,
        opened_by: user.id,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw new ConflictException(`Failed to open service ticket: ${error.message}`);
    return data;
  }

  async findAll(
    user: AuthUser,
    filters: { status?: string; priority?: string } = {},
  ) {
    let query = this.supabaseService.client
      .from('service_tickets')
      .select('*, lead:leads!lead_id(name, phone), assignee:profiles!assigned_to(full_name)')
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);

    const { data, error } = await query;
    if (error) throw new ConflictException(`Failed to load service tickets: ${error.message}`);
    return data || [];
  }

  async update(id: string, dto: UpdateServiceTicketDto, user: AuthUser) {
    const { data: existing } = await this.supabaseService.client
      .from('service_tickets')
      .select('id, status')
      .eq('id', id)
      .eq('org_id', user.org_id)
      .maybeSingle();

    if (!existing) throw new NotFoundException(`Service ticket with ID ${id} not found`);

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (dto.status) {
      patch.status = dto.status;
      // Stamp the resolution time the first time a ticket is closed out.
      if ((dto.status === 'resolved' || dto.status === 'closed') && existing.status !== dto.status) {
        patch.resolved_at = new Date().toISOString();
      }
    }
    if (dto.priority) patch.priority = dto.priority;
    if (dto.assigned_to !== undefined) patch.assigned_to = dto.assigned_to || null;
    if (dto.description !== undefined) patch.description = dto.description;

    const { data, error } = await this.supabaseService.client
      .from('service_tickets')
      .update(patch)
      .eq('id', id)
      .eq('org_id', user.org_id)
      .select()
      .single();

    if (error) throw new ConflictException(`Failed to update service ticket: ${error.message}`);
    return data;
  }
}
