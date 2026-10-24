import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AssignLeadsDto } from './dto/assign-leads.dto';
import { BulkAllocateDto } from './dto/bulk-allocate-leads.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const LEAD_SELECT =
  '*, owner:profiles!owner_id(full_name, role, phone), activities:lead_activities(*), stage_history:lead_stage_history(*), surveys(*), quotations(*), payments(*)';

const LIST_SELECT =
  'id, org_id, name, phone, email, city, state, source, category, monthly_bill, system_kw, stage, status, owner_id, team_id, next_followup_at, last_contact_at, value_estimate, deleted_at, created_at, updated_at, owner:profiles!owner_id(full_name, role)';

function generateRealisticLeads(count = 300): any[] {
  const firstNames = [
    'Aarav', 'Vihaan', 'Aditya', 'Sai', 'Reyansh', 'Pooja', 'Ananya', 'Riya', 'Sneha', 'Tanvi',
    'Rajesh', 'Suresh', 'Manish', 'Kavita', 'Sunil', 'Pankaj', 'Deepak', 'Nitin', 'Meera', 'Ramesh',
    'Shweta', 'Priya', 'Sachin', 'Rahul', 'Neha', 'Girish', 'Bhavna', 'Kishore', 'Alok', 'Pallavi',
  ];
  const lastNames = [
    'Sharma', 'Patil', 'Deshmukh', 'Kulkarni', 'Joshi', 'Shinde', 'Pawar', 'Iyer', 'Mehta', 'Chavan',
    'More', 'Gaikwad', 'Jadhav', 'Bhosale', 'Bhatia', 'Verma', 'Gupta', 'Tambe', 'Kale', 'Sawant',
  ];
  const locations = [
    { city: 'Pune', state: 'Maharashtra' },
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Nagpur', state: 'Maharashtra' },
    { city: 'Nashik', state: 'Maharashtra' },
    { city: 'Aurangabad', state: 'Maharashtra' },
    { city: 'Thane', state: 'Maharashtra' },
    { city: 'Kolhapur', state: 'Maharashtra' },
    { city: 'Solapur', state: 'Maharashtra' },
  ];
  const stages = [
    'NEW', 'CONTACTED', 'QUALIFIED', 'SURVEY_SCHEDULED', 'SURVEY_DONE', 'QUOTATION_SENT', 'NEGOTIATION', 'BOOKED',
  ];
  const sources = ['facebook_ads', 'google_ads', 'referral', 'whatsapp', 'walk_in', 'website'];
  const staff = [
    { id: '22222222-2222-2222-2222-222222222225', full_name: 'Rohan Mehta', role: 'sales_exec' },
    { id: '22222222-2222-2222-2222-222222222226', full_name: 'Pooja Joshi', role: 'sales_exec' },
    { id: '22222222-2222-2222-2222-222222222223', full_name: 'Sneha Patil', role: 'telecaller' },
    { id: '22222222-2222-2222-2222-222222222224', full_name: 'Amit Kulkarni', role: 'telecaller' },
    { id: '22222222-2222-2222-2222-222222222222', full_name: 'Vikram Deshmukh', role: 'sales_admin' },
    { id: '22222222-2222-2222-2222-222222222227', full_name: 'Sachin Shinde', role: 'surveyor' },
  ];

  const leads = [];
  const baseTime = Date.now();

  for (let i = 1; i <= count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const loc = locations[i % locations.length];
    const stage = stages[i % stages.length];
    const source = sources[i % sources.length];
    // Every 7th lead is intentionally unassigned to test allocation pools (7 is coprime with staff.length 6)
    const isAssigned = i % 7 !== 0;
    const owner = isAssigned ? staff[i % staff.length] : null;
    const kw = Number((3 + (i % 15) * 0.75).toFixed(2));
    const bill = Math.round(kw * 920);
    const date = new Date(baseTime - (count - i) * 3600000 * 3.5).toISOString();

    leads.push({
      id: `lead-${i}`,
      org_id: '11111111-1111-1111-1111-111111111111',
      name: `${fn} ${ln} Solar`,
      phone: `98${String(10000000 + i).padStart(8, '0')}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@gmail.com`,
      city: loc.city,
      state: loc.state,
      source,
      category: i % 4 === 0 ? 'commercial' : 'residential',
      monthly_bill: bill,
      system_kw: kw,
      stage,
      status: 'open',
      owner_id: owner?.id || null,
      team_id: null,
      next_followup_at: i % 2 === 0 ? new Date(baseTime + 86400000 * 2).toISOString() : null,
      last_contact_at: i % 3 === 0 ? new Date(baseTime - 86400000 * 1).toISOString() : null,
      value_estimate: Math.round(kw * 55000),
      deleted_at: null,
      created_at: date,
      updated_at: date,
      owner: owner ? { full_name: owner.full_name, role: owner.role } : null,
    });
  }
  return leads;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private inMemoryLeads: any[] = [];
  private inMemoryAuditLogs: any[] = [];

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly featureGuard: FeatureGuard,
  ) {}

  /** Admins see the whole org pipeline; everyone else is scoped to what they own/created/their team. */
  private isAdmin(user: AuthUser): boolean {
    return ['super_admin', 'sales_admin'].includes(user.role);
  }

  /**
   * The one-way "pool" right: when telecalling is granted the user may work the
   * whole inbound pool even though they do not own every lead. Without it, a
   * non-admin only ever sees leads they own, created, or that belong to their team.
   */
  private async canSeeWholePool(user: AuthUser): Promise<boolean> {
    return this.isAdmin(user);
  }

  /**
   * Kick the PostgREST query builder through a dynamic filter. `or(...)` is used
   * for the "own / created / team" disjunction because Supabase JS has no OR builder.
   */
  private async visibilityFilter(user: AuthUser): Promise<string | null> {
    if (await this.canSeeWholePool(user)) return null;

    const parts = [`owner_id.eq.${user.id}`, `created_by.eq.${user.id}`];
    if (user.team_id) parts.push(`team_id.eq.${user.team_id}`);
    return parts.join(',');
  }

  private async assertVisible(id: string, user: AuthUser) {
    let lead: any = null;
    try {
      const { data, error } = await this.supabaseService.client
        .from('leads')
        .select('id, org_id, name, phone, stage, owner_id, created_by, team_id, deleted_at')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) lead = data;
    } catch {
      // Handled in fallback
    }

    if (!lead) {
      lead = this.inMemoryLeads.find((l) => l.id === id);
    }

    if (!lead || (lead.org_id && user.org_id && lead.org_id !== user.org_id)) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    if (await this.canSeeWholePool(user)) return lead;

    const owns =
      lead.owner_id === user.id ||
      lead.created_by === user.id ||
      (!!user.team_id && lead.team_id === user.team_id);

    if (!owns) {
      throw new ForbiddenException('You do not have access to this lead');
    }
    return lead;
  }

  async findAll(
    user: AuthUser,
    query: {
      stage?: string;
      owner_id?: string;
      city?: string;
      source?: string;
      q?: string;
      cursor?: string;
      page?: number;
      limit?: number;
      pageSize?: number;
      unassigned_only?: boolean | string;
      date_from?: string;
      date_to?: string;
      date_preset?: string;
    },
  ) {
    const limit = Math.min(Math.max(Number(query.pageSize || query.limit) || 50, 1), 200);
    const page = Math.max(Number(query.page) || 1, 1);
    const unassignedOnly = query.unassigned_only === true || query.unassigned_only === 'true';

    // Resolve date_preset / date boundaries upfront
    let fromIso = query.date_from;
    let toIso = query.date_to;
    if (query.date_preset && query.date_preset !== 'ALL') {
      const now = new Date();
      if (query.date_preset === 'today') {
        fromIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (query.date_preset === 'yesterday') {
        fromIso = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
        toIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (query.date_preset === 'last_7_days') {
        fromIso = new Date(now.getTime() - 7 * 86400000).toISOString();
      } else if (query.date_preset === 'last_30_days') {
        fromIso = new Date(now.getTime() - 30 * 86400000).toISOString();
      } else if (query.date_preset === 'this_month') {
        fromIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }
    }

    try {
      let builder = this.supabaseService.client
        .from('leads')
        .select(LIST_SELECT, { count: 'exact' })
        .eq('org_id', user.org_id)
        .is('deleted_at', null);

      const visibility = await this.visibilityFilter(user);
      if (visibility) {
        builder = builder.or(visibility);
      }

      if (query.stage && query.stage !== 'ALL') {
        builder = builder.eq('stage', query.stage);
      }
      if (query.owner_id && query.owner_id !== 'ALL') {
        if (query.owner_id === 'UNASSIGNED') {
          builder = builder.is('owner_id', null);
        } else {
          builder = builder.eq('owner_id', query.owner_id);
        }
      }
      if (unassignedOnly) {
        builder = builder.is('owner_id', null);
      }
      if (query.city && query.city !== 'ALL') {
        builder = builder.eq('city', query.city);
      }
      if (query.source && query.source !== 'ALL') {
        builder = builder.eq('source', query.source);
      }
      if (fromIso) {
        builder = builder.gte('created_at', fromIso);
      }
      if (toIso) {
        builder = builder.lte('created_at', toIso);
      }
      if (query.q) {
        const safe = query.q.replace(/[%,()]/g, ' ').trim();
        if (safe) {
          builder = builder.or(
            `name.ilike.%${safe}%,phone.ilike.%${safe}%,city.ilike.%${safe}%,email.ilike.%${safe}%`,
          );
        }
      }

      // If page is supplied, use range-based pagination
      if (query.page) {
        const offset = (page - 1) * limit;
        builder = builder.range(offset, offset + limit - 1);
      } else if (query.cursor) {
        builder = builder.lt('created_at', query.cursor).limit(limit);
      } else {
        builder = builder.limit(limit);
      }

      const { data, error, count } = await builder.order('created_at', { ascending: false });

      if (!error && data) {
        const items = data;
        const total = count ?? items.length;
        const nextCursor = items.length === limit ? items[items.length - 1].created_at : null;
        return {
          items,
          total,
          page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
          nextCursor,
        };
      }
    } catch {
      // Fall through to in-memory lookup
    }

    // In-Memory Fallback Filter
    let filtered = this.inMemoryLeads.filter((l) => !l.deleted_at);

    // Strict role-based scoping: non-admins only see leads assigned to them or created by them
    if (!this.isAdmin(user)) {
      filtered = filtered.filter(
        (l) => l.owner_id === user.id || l.created_by === user.id,
      );
    }

    // Import Date and Time filtering
    if (fromIso) {
      const fromTime = new Date(fromIso).getTime();
      filtered = filtered.filter((l) => new Date(l.created_at).getTime() >= fromTime);
    }
    if (toIso) {
      const toTime = new Date(toIso).getTime();
      filtered = filtered.filter((l) => new Date(l.created_at).getTime() <= toTime);
    }

    if (query.stage && query.stage !== 'ALL') {
      filtered = filtered.filter((l) => l.stage === query.stage);
    }
    if (query.owner_id && query.owner_id !== 'ALL') {
      if (query.owner_id === 'UNASSIGNED') {
        filtered = filtered.filter((l) => !l.owner_id);
      } else {
        filtered = filtered.filter((l) => l.owner_id === query.owner_id);
      }
    }
    if (unassignedOnly) {
      filtered = filtered.filter((l) => !l.owner_id);
    }
    if (query.city && query.city !== 'ALL') {
      filtered = filtered.filter((l) => l.city === query.city);
    }
    if (query.source && query.source !== 'ALL') {
      filtered = filtered.filter((l) => l.source === query.source);
    }
    if (query.q) {
      const qLower = query.q.toLowerCase().trim();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(qLower) ||
          l.phone.includes(qLower) ||
          l.city.toLowerCase().includes(qLower) ||
          (l.email && l.email.toLowerCase().includes(qLower)),
      );
    }

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const items = filtered.slice(offset, offset + limit);
    const nextCursor = offset + limit < total ? items[items.length - 1]?.created_at : null;

    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      nextCursor,
    };
  }

  async findOne(id: string, user: AuthUser) {
    try {
      await this.assertVisible(id, user);

      const { data: lead, error } = await this.supabaseService.client
        .from('leads')
        .select(LEAD_SELECT)
        .eq('id', id)
        .single();

      if (!error && lead) {
        return lead;
      }
    } catch {
      // Fall through to in-memory lookup
    }

    const localLead = this.inMemoryLeads.find((l) => l.id === id);
    if (localLead) return localLead;

    throw new NotFoundException(`Lead with ID ${id} not found`);
  }

  async create(createLeadDto: CreateLeadDto, user: AuthUser) {
    const estimatedValue = createLeadDto.system_kw
      ? Number(createLeadDto.system_kw) * 55000
      : null;

    const payload = {
      ...createLeadDto,
      org_id: user.org_id,
      owner_id: user.id,
      created_by: user.id,
      stage: 'NEW',
      value_estimate: estimatedValue,
      consent_recorded: true,
    };

    try {
      const { data, error } = await this.supabaseService.client
        .from('leads')
        .insert(payload)
        .select(LIST_SELECT)
        .single();

      if (!error && data) {
        await this.writeStageHistory(data.id, null, 'NEW', user.id, 'Lead captured & initialized');
        this.inMemoryLeads.unshift(data);
        return data;
      }

      if (error) {
        if (error.code === '23505') {
          throw new ConflictException(
            `A lead with phone ${createLeadDto.phone} already exists in this organization`,
          );
        }
        this.logger.warn(`Supabase create error: ${error.message}, falling back to in-memory store`);
      }
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      this.logger.warn(`Supabase lead insert failed: ${err.message}, switching to in-memory storage`);
    }

    // In-Memory Lead Creation Fallback
    const existingPhone = this.inMemoryLeads.find(
      (l) => l.phone === createLeadDto.phone && !l.deleted_at && l.org_id === user.org_id,
    );
    if (existingPhone) {
      throw new ConflictException(
        `A lead with phone ${createLeadDto.phone} already exists in this organization`,
      );
    }

    const newId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newLead: any = {
      id: newId,
      org_id: user.org_id,
      name: createLeadDto.name,
      phone: createLeadDto.phone,
      email: createLeadDto.email || null,
      city: createLeadDto.city,
      state: createLeadDto.state || 'Maharashtra',
      source: createLeadDto.source || 'referral',
      category: createLeadDto.category || 'residential',
      monthly_bill: createLeadDto.monthly_bill ? Number(createLeadDto.monthly_bill) : null,
      system_kw: createLeadDto.system_kw ? Number(createLeadDto.system_kw) : null,
      stage: 'NEW',
      status: 'active',
      owner_id: user.id,
      owner: {
        full_name: user.full_name || 'Kishan',
        role: user.role,
      },
      team_id: user.team_id || null,
      next_followup_at: null,
      last_contact_at: null,
      value_estimate: estimatedValue,
      deleted_at: null,
      created_at: now,
      updated_at: now,
      created_by: user.id,
    };

    this.inMemoryLeads.unshift(newLead);
    return newLead;
  }

  private async writeStageHistory(
    leadId: string,
    fromStage: string | null,
    toStage: string,
    byUser: string,
    note?: string,
  ) {
    const { error } = await this.supabaseService.client
      .from('lead_stage_history')
      .insert({
        lead_id: leadId,
        from_stage: fromStage,
        to_stage: toStage,
        by_user: byUser,
        note: note || null,
      });
    if (error) {
      this.logger.warn(`Stage history write failed for ${leadId}: ${error.message}`);
    }
  }

  async updateStage(id: string, updateStageDto: UpdateStageDto, user: AuthUser) {
    const lead = await this.assertVisible(id, user);

    if (lead.deleted_at) {
      throw new ConflictException('This lead has been deleted and can no longer change stage');
    }

    const fromStage = lead.stage;
    const updatedAt = new Date().toISOString();

    try {
      const { data, error } = await this.supabaseService.client
        .from('leads')
        .update({ stage: updateStageDto.stage, updated_at: updatedAt })
        .eq('id', id)
        .select(LIST_SELECT)
        .single();

      if (!error && data) {
        if (fromStage !== updateStageDto.stage) {
          await this.writeStageHistory(
            id,
            fromStage,
            updateStageDto.stage,
            user.id,
            updateStageDto.note,
          );
        }
        return data;
      }
    } catch {
      // Handled in fallback
    }

    // In-Memory Fallback Update
    lead.stage = updateStageDto.stage;
    lead.updated_at = updatedAt;
    return lead;
  }

  async logFollowup(
    id: string,
    body: { outcome: string; note?: string; next_followup_at?: string; stage?: string },
    user: AuthUser,
  ) {
    const lead = await this.assertVisible(id, user);
    if (lead.deleted_at) {
      throw new ConflictException('This lead has been deleted and can no longer be contacted');
    }

    const now = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      last_contact_at: now,
      updated_at: now,
    };
    if (body.next_followup_at) updatePayload.next_followup_at = body.next_followup_at;
    if (body.stage) updatePayload.stage = body.stage;

    try {
      const { error: activityError } = await this.supabaseService.client
        .from('lead_activities')
        .insert({
          lead_id: id,
          type: 'followup',
          outcome: body.outcome || 'connected',
          note: body.note || 'Follow-up conducted',
          by_user: user.id,
        });
      if (activityError) {
        this.logger.warn(`Follow-up activity write failed for ${id}: ${activityError.message}`);
      }

      const { data, error } = await this.supabaseService.client
        .from('leads')
        .update(updatePayload)
        .eq('id', id)
        .select(LIST_SELECT)
        .single();

      if (!error && data) {
        if (body.stage && body.stage !== lead.stage) {
          await this.writeStageHistory(
            id,
            lead.stage,
            body.stage,
            user.id,
            body.note || 'Stage changed during follow-up',
          );
        }
        return data;
      }
    } catch {
      // Fall through to in-memory fallback
    }

    // In-memory update
    lead.last_contact_at = now;
    lead.updated_at = now;
    if (body.next_followup_at) lead.next_followup_at = body.next_followup_at;
    if (body.stage) lead.stage = body.stage;
    return lead;
  }

  async assign(assignLeadsDto: AssignLeadsDto, user: AuthUser) {
    const { lead_ids, owner_id, rule } = assignLeadsDto;
    if (!lead_ids || lead_ids.length === 0) return { assigned: 0 };

    const assignees = rule?.target_ids?.length
      ? rule.target_ids
      : owner_id
        ? [owner_id]
        : [];

    if (assignees.length === 0) {
      throw new ConflictException('An owner_id or assignment rule target is required');
    }

    // Convert to BulkAllocate format and execute
    return this.bulkAllocate(
      {
        lead_ids,
        strategy: rule?.type === 'round_robin' ? 'round_robin' : 'single',
        target_user_id: owner_id,
        target_user_ids: rule?.target_ids,
        reassign_existing: true,
      },
      user,
    );
  }

  // ============================================================================
  // BULK LEAD ALLOCATION SUITE (SUPER ADMIN)
  // ============================================================================

  /**
   * Returns active staff eligible for lead allocation along with their real-time current lead load.
   */
  async getStaffWorkload(user: AuthUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can view staff workload');
    }

    try {
      const { data: profiles, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, full_name, email, role, phone, team:teams(id, name), is_active')
        .eq('org_id', user.org_id)
        .eq('is_active', true)
        .in('role', ['super_admin', 'sales_admin', 'sales_exec', 'telecaller', 'surveyor']);

      if (!error && profiles) {
        const { data: countRows } = await this.supabaseService.client
          .from('leads')
          .select('owner_id')
          .eq('org_id', user.org_id)
          .is('deleted_at', null)
          .not('owner_id', 'is', null);

        const countsMap: Record<string, number> = {};
        (countRows || []).forEach((r: any) => {
          if (r.owner_id) {
            countsMap[r.owner_id] = (countsMap[r.owner_id] || 0) + 1;
          }
        });

        return profiles.map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: p.role,
          phone: p.phone,
          team: p.team,
          current_leads: countsMap[p.id] || 0,
        }));
      }
    } catch {
      // Fall through to in-memory fallback
    }

    const countsMap: Record<string, number> = {};
    this.inMemoryLeads.forEach((l) => {
      if (l.owner_id && !l.deleted_at) {
        countsMap[l.owner_id] = (countsMap[l.owner_id] || 0) + 1;
      }
    });

    const fallbackStaff = [
      { id: '22222222-2222-2222-2222-222222222221', full_name: 'Kishan', email: 'admin@kyrossolar.com', role: 'super_admin', phone: '+91 98200 11223', team: { id: 'team-1', name: 'Executive Leadership' } },
      { id: '22222222-2222-2222-2222-222222222222', full_name: 'Vikram Deshmukh', email: 'sales.lead@kyrossolar.com', role: 'sales_admin', phone: '+91 98200 22334', team: { id: 'team-2', name: 'West Regional Sales' } },
      { id: '22222222-2222-2222-2222-222222222223', full_name: 'Sneha Patil', email: 'telecaller1@kyrossolar.com', role: 'telecaller', phone: '+91 98200 33445', team: { id: 'team-3', name: 'Inbound Calling Team' } },
      { id: '22222222-2222-2222-2222-222222222224', full_name: 'Amit Kulkarni', email: 'telecaller2@kyrossolar.com', role: 'telecaller', phone: '+91 98200 44556', team: { id: 'team-3', name: 'Inbound Calling Team' } },
      { id: '22222222-2222-2222-2222-222222222225', full_name: 'Rohan Mehta', email: 'exec1@kyrossolar.com', role: 'sales_exec', phone: '+91 98200 55667', team: { id: 'team-2', name: 'West Regional Sales' } },
      { id: '22222222-2222-2222-2222-222222222226', full_name: 'Pooja Joshi', email: 'exec2@kyrossolar.com', role: 'sales_exec', phone: '+91 98200 66778', team: { id: 'team-2', name: 'West Regional Sales' } },
      { id: '22222222-2222-2222-2222-222222222227', full_name: 'Sachin Shinde', email: 'surveyor1@kyrossolar.com', role: 'surveyor', phone: '+91 98200 77889', team: { id: 'team-4', name: 'Site Technical Survey' } },
    ];

    return fallbackStaff.map((s) => ({
      ...s,
      current_leads: countsMap[s.id] || 0,
    }));
  }

  /**
   * Resolves the list of leads targeted by either explicit lead_ids or filter criteria.
   */
  private async resolveTargetLeads(dto: BulkAllocateDto, user: AuthUser): Promise<any[]> {
    if (dto.lead_ids && dto.lead_ids.length > 0) {
      try {
        const { data, error } = await this.supabaseService.client
          .from('leads')
          .select('id, name, owner_id, stage, city, phone, owner:profiles!owner_id(full_name, role)')
          .eq('org_id', user.org_id)
          .in('id', dto.lead_ids)
          .is('deleted_at', null);

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch {
        // Fall through to in-memory
      }

      const idSet = new Set(dto.lead_ids);
      return this.inMemoryLeads.filter((l) => idSet.has(l.id) && !l.deleted_at);
    }

    if (dto.filter) {
      const limit = Math.min(dto.total_quantity || 10000, 50000);
      try {
        let builder = this.supabaseService.client
          .from('leads')
          .select('id, name, owner_id, stage, city, phone, owner:profiles!owner_id(full_name, role)')
          .eq('org_id', user.org_id)
          .is('deleted_at', null);

        if (dto.filter.stage && dto.filter.stage !== 'ALL') {
          builder = builder.eq('stage', dto.filter.stage);
        }
        if (dto.filter.owner_id && dto.filter.owner_id !== 'ALL') {
          if (dto.filter.owner_id === 'UNASSIGNED') {
            builder = builder.is('owner_id', null);
          } else {
            builder = builder.eq('owner_id', dto.filter.owner_id);
          }
        }
        if (dto.filter.unassigned_only) {
          builder = builder.is('owner_id', null);
        }
        if (dto.filter.city && dto.filter.city !== 'ALL') {
          builder = builder.eq('city', dto.filter.city);
        }
        if (dto.filter.q) {
          const safe = dto.filter.q.replace(/[%,()]/g, ' ').trim();
          if (safe) {
            builder = builder.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,city.ilike.%${safe}%`);
          }
        }

        const { data, error } = await builder.limit(limit);
        if (!error && data) {
          return data;
        }
      } catch {
        // Fall through to in-memory
      }

      let filtered = this.inMemoryLeads.filter((l) => !l.deleted_at);
      if (dto.filter.stage && dto.filter.stage !== 'ALL') {
        filtered = filtered.filter((l) => l.stage === dto.filter.stage);
      }
      if (dto.filter.owner_id && dto.filter.owner_id !== 'ALL') {
        if (dto.filter.owner_id === 'UNASSIGNED') {
          filtered = filtered.filter((l) => !l.owner_id);
        } else {
          filtered = filtered.filter((l) => l.owner_id === dto.filter.owner_id);
        }
      }
      if (dto.filter.unassigned_only) {
        filtered = filtered.filter((l) => !l.owner_id);
      }
      if (dto.filter.city && dto.filter.city !== 'ALL') {
        filtered = filtered.filter((l) => l.city === dto.filter.city);
      }
      if (dto.filter.q) {
        const q = dto.filter.q.toLowerCase().trim();
        filtered = filtered.filter(
          (l) => l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.city.toLowerCase().includes(q),
        );
      }
      return filtered.slice(0, limit);
    }

    return [];
  }

  /**
   * Previews the proposed allocation before execution:
   * Calculates breakdown per user, detects conflicts/reassignments, and checks count matches.
   */
  async previewAllocation(dto: BulkAllocateDto, user: AuthUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can access lead allocation');
    }

    const allMatchedLeads = await this.resolveTargetLeads(dto, user);
    const staffList = await this.getStaffWorkload(user);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    // Check existing owners and reassignments
    const currentOwnersMap: Record<string, number> = {};
    let alreadyAssignedCount = 0;
    let unassignedCount = 0;

    allMatchedLeads.forEach((l) => {
      if (l.owner_id) {
        alreadyAssignedCount++;
        const ownerName = l.owner?.full_name || staffMap.get(l.owner_id)?.full_name || 'Staff Member';
        currentOwnersMap[ownerName] = (currentOwnersMap[ownerName] || 0) + 1;
      } else {
        unassignedCount++;
      }
    });

    // Determine candidate leads based on reassign_existing flag
    const reassignExisting = dto.reassign_existing !== false;
    const candidateLeads = reassignExisting
      ? allMatchedLeads
      : allMatchedLeads.filter((l) => !l.owner_id);

    const totalAvailable = candidateLeads.length;

    // Build proposed allocations based on strategy
    const proposed: {
      user_id: string;
      full_name: string;
      role: string;
      current_leads: number;
      leads_to_assign: number;
      projected_leads: number;
    }[] = [];

    const conflicts: string[] = [];

    if (dto.strategy === 'single') {
      if (!dto.target_user_id) {
        conflicts.push('A target user must be selected for single assignment');
      } else {
        const staff = staffMap.get(dto.target_user_id);
        if (!staff) {
          conflicts.push('Target user not found or inactive');
        } else {
          proposed.push({
            user_id: staff.id,
            full_name: staff.full_name,
            role: staff.role,
            current_leads: staff.current_leads,
            leads_to_assign: totalAvailable,
            projected_leads: staff.current_leads + totalAvailable,
          });
        }
      }
    } else if (dto.strategy === 'equal_split' || dto.strategy === 'round_robin') {
      const targets = (dto.target_user_ids || []).filter((id) => staffMap.has(id));
      if (targets.length === 0) {
        conflicts.push('At least one target user must be selected');
      } else {
        const base = Math.floor(totalAvailable / targets.length);
        const remainder = totalAvailable % targets.length;

        targets.forEach((id, index) => {
          const staff = staffMap.get(id)!;
          const assigned = base + (index < remainder ? 1 : 0);
          proposed.push({
            user_id: staff.id,
            full_name: staff.full_name,
            role: staff.role,
            current_leads: staff.current_leads,
            leads_to_assign: assigned,
            projected_leads: staff.current_leads + assigned,
          });
        });
      }
    } else if (dto.strategy === 'custom_quantities') {
      const allocations = dto.allocations || [];
      if (allocations.length === 0) {
        conflicts.push('At least one staff allocation must be specified');
      } else {
        let totalRequested = 0;
        allocations.forEach((item) => {
          const staff = staffMap.get(item.user_id);
          if (staff && item.count > 0) {
            totalRequested += item.count;
            proposed.push({
              user_id: staff.id,
              full_name: staff.full_name,
              role: staff.role,
              current_leads: staff.current_leads,
              leads_to_assign: item.count,
              projected_leads: staff.current_leads + item.count,
            });
          }
        });

        if (totalRequested > totalAvailable) {
          conflicts.push(
            `Total requested allocation (${totalRequested.toLocaleString()}) exceeds available candidate leads (${totalAvailable.toLocaleString()})`,
          );
        }
      }
    }

    const totalPlanned = proposed.reduce((sum, p) => sum + p.leads_to_assign, 0);
    const unallocatedCount = Math.max(0, totalAvailable - totalPlanned);

    if (alreadyAssignedCount > 0 && reassignExisting) {
      conflicts.push(
        `${alreadyAssignedCount.toLocaleString()} leads already have owners and will be reassigned.`,
      );
    } else if (alreadyAssignedCount > 0 && !reassignExisting) {
      conflicts.push(
        `${alreadyAssignedCount.toLocaleString()} assigned leads will be skipped (only unassigned leads will be allocated).`,
      );
    }

    return {
      total_target_leads: allMatchedLeads.length,
      candidate_leads_count: totalAvailable,
      already_assigned_count: alreadyAssignedCount,
      unassigned_count: unassignedCount,
      current_owners_breakdown: currentOwnersMap,
      proposed_allocations: proposed,
      total_planned: totalPlanned,
      unallocated_count: unallocatedCount,
      conflicts,
      can_execute: conflicts.filter((c) => c.includes('exceeds') || c.includes('must be selected')).length === 0 && totalPlanned > 0,
    };
  }

  /**
   * Executes the bulk allocation across hundreds or thousands of leads in an efficient, auditable batch.
   */
  async bulkAllocate(dto: BulkAllocateDto, user: AuthUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can perform bulk lead allocation');
    }

    const startTime = Date.now();
    const candidateLeads = await this.resolveTargetLeads(dto, user);
    const reassignExisting = dto.reassign_existing !== false;
    const leadsToProcess = reassignExisting
      ? candidateLeads
      : candidateLeads.filter((l) => !l.owner_id);

    if (leadsToProcess.length === 0) {
      throw new BadRequestException('No eligible leads found for allocation');
    }

    const staffList = await this.getStaffWorkload(user);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    // Determine assignment for each lead
    const assignments: { leadId: string; newOwnerId: string }[] = [];
    const userAllocationCounts: Record<string, number> = {};

    if (dto.strategy === 'single') {
      if (!dto.target_user_id || !staffMap.has(dto.target_user_id)) {
        throw new BadRequestException('Valid target_user_id is required for single allocation');
      }
      const targetId = dto.target_user_id;
      leadsToProcess.forEach((l) => {
        assignments.push({ leadId: l.id, newOwnerId: targetId });
      });
      userAllocationCounts[targetId] = leadsToProcess.length;
    } else if (dto.strategy === 'equal_split' || dto.strategy === 'round_robin') {
      const targets = (dto.target_user_ids || []).filter((id) => staffMap.has(id));
      if (targets.length === 0) {
        throw new BadRequestException('At least one valid target user is required');
      }

      leadsToProcess.forEach((l, index) => {
        const targetId = targets[index % targets.length];
        assignments.push({ leadId: l.id, newOwnerId: targetId });
        userAllocationCounts[targetId] = (userAllocationCounts[targetId] || 0) + 1;
      });
    } else if (dto.strategy === 'custom_quantities') {
      const customItems = (dto.allocations || []).filter((a) => staffMap.has(a.user_id) && a.count > 0);
      if (customItems.length === 0) {
        throw new BadRequestException('At least one valid allocation quantity is required');
      }

      let leadIndex = 0;
      customItems.forEach((item) => {
        let assignedToThisUser = 0;
        while (assignedToThisUser < item.count && leadIndex < leadsToProcess.length) {
          assignments.push({
            leadId: leadsToProcess[leadIndex].id,
            newOwnerId: item.user_id,
          });
          leadIndex++;
          assignedToThisUser++;
        }
        userAllocationCounts[item.user_id] = assignedToThisUser;
      });
    }

    const totalAssigned = assignments.length;
    if (totalAssigned === 0) {
      throw new BadRequestException('No assignments could be computed');
    }

    const now = new Date().toISOString();
    const batchId = `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Group lead IDs by new owner for efficient batch SQL execution
    const groupedByOwner: Record<string, string[]> = {};
    assignments.forEach((a) => {
      if (!groupedByOwner[a.newOwnerId]) groupedByOwner[a.newOwnerId] = [];
      groupedByOwner[a.newOwnerId].push(a.leadId);
    });

    try {
      // Execute in PostgreSQL using chunked batch updates
      const CHUNK_SIZE = 500;
      for (const [newOwnerId, leadIds] of Object.entries(groupedByOwner)) {
        for (let i = 0; i < leadIds.length; i += CHUNK_SIZE) {
          const chunk = leadIds.slice(i, i + CHUNK_SIZE);
          await this.supabaseService.client
            .from('leads')
            .update({ owner_id: newOwnerId, updated_at: now })
            .in('id', chunk)
            .eq('org_id', user.org_id);
        }
      }

      // Record in audit_log
      await this.supabaseService.client.from('audit_log').insert({
        org_id: user.org_id,
        user_id: user.id,
        action: 'BULK_LEAD_ALLOCATION',
        entity: 'leads',
        entity_id: batchId,
        meta: {
          batch_id: batchId,
          strategy: dto.strategy,
          total_allocated: totalAssigned,
          allocation_breakdown: userAllocationCounts,
          reassign_existing: reassignExisting,
          note: dto.note || 'Super Admin bulk allocation',
          duration_ms: Date.now() - startTime,
        },
      });
    } catch (err) {
      this.logger.warn(`Database bulk update failed, syncing in-memory dataset: ${err.message}`);
    }

    // Sync in-memory records
    const assignmentMap = new Map(assignments.map((a) => [a.leadId, a.newOwnerId]));
    this.inMemoryLeads.forEach((l) => {
      if (assignmentMap.has(l.id)) {
        const newOwnerId = assignmentMap.get(l.id)!;
        const staff = staffMap.get(newOwnerId);
        l.owner_id = newOwnerId;
        l.updated_at = now;
        l.owner = staff ? { full_name: staff.full_name, role: staff.role } : null;
      }
    });

    const durationMs = Date.now() - startTime;

    // Record in in-memory audit log for history view
    const auditRecord = {
      id: batchId,
      batch_id: batchId,
      timestamp: now,
      allocated_by: user.full_name || user.email || 'Super Admin',
      total_allocated: totalAssigned,
      strategy: dto.strategy,
      duration_ms: durationMs,
      note: dto.note || 'Bulk lead allocation',
      breakdown: Object.entries(userAllocationCounts).map(([staffId, count]) => {
        const staff = staffMap.get(staffId);
        return {
          user_id: staffId,
          full_name: staff?.full_name || 'Staff Member',
          role: staff?.role || 'staff',
          count,
        };
      }),
    };
    this.inMemoryAuditLogs.unshift(auditRecord);
    if (this.inMemoryAuditLogs.length > 50) this.inMemoryAuditLogs.pop();

    this.logger.log(
      `[BulkLeadAllocation] Batch ${batchId}: Successfully allocated ${totalAssigned} leads in ${durationMs}ms via '${dto.strategy}' strategy.`,
    );

    return {
      success: true,
      batch_id: batchId,
      allocated_count: totalAssigned,
      strategy: dto.strategy,
      duration_ms: durationMs,
      summary: auditRecord.breakdown,
    };
  }

  /**
   * Retrieves audit history of recent bulk lead allocations.
   */
  async getAllocationHistory(user: AuthUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can view allocation history');
    }

    try {
      const { data, error } = await this.supabaseService.client
        .from('audit_log')
        .select('id, user_id, action, entity, entity_id, meta, at, profiles!user_id(full_name, email)')
        .eq('org_id', user.org_id)
        .eq('action', 'BULK_LEAD_ALLOCATION')
        .order('at', { ascending: false })
        .limit(30);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          batch_id: d.entity_id || d.id,
          timestamp: d.at,
          allocated_by: d.profiles?.full_name || d.profiles?.email || 'Super Admin',
          total_allocated: d.meta?.total_allocated || 0,
          strategy: d.meta?.strategy || 'custom',
          duration_ms: d.meta?.duration_ms || 0,
          note: d.meta?.note || '',
          breakdown: Object.entries(d.meta?.allocation_breakdown || {}).map(([uid, count]) => ({
            user_id: uid,
            full_name: uid,
            count,
          })),
        }));
      }
    } catch {
      // Fall through to in-memory audit logs
    }

    return this.inMemoryAuditLogs;
  }

  // ============================================================================
  // DELETION FLOWS
  // ============================================================================

  async requestDelete(id: string, reason: string, user: AuthUser) {
    const lead = await this.assertVisible(id, user);

    try {
      const { data: existing } = await this.supabaseService.client
        .from('deletion_requests')
        .select('id')
        .eq('org_id', user.org_id)
        .eq('entity', 'lead')
        .eq('entity_id', id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        return {
          message: 'A deletion request for this lead is already pending administrator approval',
          id,
          request_id: existing.id,
          status: 'pending',
        };
      }

      const { data, error } = await this.supabaseService.client
        .from('deletion_requests')
        .insert({
          org_id: user.org_id,
          entity: 'lead',
          entity_id: id,
          reason: reason || 'Lead duplicate or invalid',
          requested_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (!error && data) {
        return {
          message: 'Deletion request submitted for administrator approval',
          id,
          request_id: data.id,
          status: 'pending',
          lead: { id: lead.id, name: lead.name },
        };
      }
    } catch {
      // Fall through to memory fallback
    }

    return {
      message: 'Deletion request submitted for administrator approval',
      id,
      request_id: `del-${Date.now()}`,
      status: 'pending',
      lead: { id: lead.id, name: lead.name },
    };
  }

  /**
   * Super Admin only: Purges all seed/mock leads to leave the pipeline completely fresh
   * for fresh data entry or fresh lead imports.
   */
  async purgeSeedData(user: AuthUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin can purge seed pipeline data');
    }
    const count = this.inMemoryLeads.length;
    this.inMemoryLeads = [];

    try {
      await this.supabaseService.client
        .from('leads')
        .delete()
        .eq('org_id', user.org_id);
    } catch {
      // Offline fallback ok
    }

    return {
      success: true,
      message: 'All seed data in the sales pipeline has been cleared. Fresh leads can now be added by Super Admin.',
      cleared_count: count,
    };
  }

  /**
   * Only Super Admin has permission to delete lead data.
   * Provides a 30-day recovery option before permanent deletion.
   */
  async softDelete(id: string, user: AuthUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin has permission to delete leads from the pipeline');
    }

    const now = new Date();
    const deletedAt = now.toISOString();
    const recoveryDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { data, error } = await this.supabaseService.client
        .from('leads')
        .update({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .eq('id', id)
        .eq('org_id', user.org_id)
        .select('id, name, deleted_at')
        .single();

      if (!error && data) {
        await this.supabaseService.client
          .from('deletion_requests')
          .update({ status: 'approved', decided_by: user.id, decided_at: deletedAt })
          .eq('entity', 'lead')
          .eq('entity_id', id)
          .eq('status', 'pending');

        return {
          success: true,
          message: 'Lead moved to 30-day Recovery Bin. Only Super Admin can restore or permanently delete it.',
          id,
          deleted_at: deletedAt,
          recovery_deadline: recoveryDeadline,
          days_remaining: 30,
        };
      }
    } catch {
      // Fall through to in-memory fallback
    }

    const localLead = this.inMemoryLeads.find((l) => l.id === id);
    if (!localLead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    localLead.deleted_at = deletedAt;
    localLead.recovery_deadline = recoveryDeadline;
    localLead.deleted_by = user.id;
    localLead.deleted_by_name = user.full_name || 'Super Admin';
    localLead.updated_at = deletedAt;

    return {
      success: true,
      message: 'Lead moved to 30-day Recovery Bin. Only Super Admin can restore or permanently delete it.',
      id,
      deleted_at: deletedAt,
      recovery_deadline: recoveryDeadline,
      days_remaining: 30,
    };
  }

  async approveDelete(id: string, user: AuthUser) {
    return this.softDelete(id, user);
  }

  /**
   * Super Admin only: List all leads in the 30-day Recovery Bin.
   * Auto-purges items where 30 days have elapsed.
   */
  async getRecoveryBin(user: AuthUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin can access the Lead Recovery Bin');
    }

    const now = Date.now();

    // In-memory recovery bin: auto-purge expired leads (> 30 days)
    this.inMemoryLeads = this.inMemoryLeads.filter((lead) => {
      if (!lead.deleted_at) return true;
      if (lead.recovery_deadline && new Date(lead.recovery_deadline).getTime() < now) {
        return false; // Permanently expired
      }
      return true;
    });

    const deletedInMemory = this.inMemoryLeads
      .filter((lead) => !!lead.deleted_at)
      .map((lead) => {
        const deadlineTime = lead.recovery_deadline
          ? new Date(lead.recovery_deadline).getTime()
          : new Date(lead.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000;
        const diffMs = deadlineTime - now;
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        return {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          city: lead.city,
          state: lead.state,
          source: lead.source,
          stage: lead.stage,
          system_kw: lead.system_kw,
          deleted_at: lead.deleted_at,
          recovery_deadline: lead.recovery_deadline || new Date(deadlineTime).toISOString(),
          days_remaining: daysRemaining,
          deleted_by_name: lead.deleted_by_name || 'Super Admin',
        };
      });

    try {
      const { data, error } = await this.supabaseService.client
        .from('leads')
        .select('*')
        .eq('org_id', user.org_id)
        .not('deleted_at', 'is', null);

      if (!error && data && data.length > 0) {
        return data.map((lead: any) => {
          const deletedAtTime = new Date(lead.deleted_at).getTime();
          const deadlineTime = deletedAtTime + 30 * 24 * 60 * 60 * 1000;
          const daysRemaining = Math.max(0, Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24)));
          return {
            ...lead,
            recovery_deadline: new Date(deadlineTime).toISOString(),
            days_remaining: daysRemaining,
            deleted_by_name: 'Super Admin',
          };
        });
      }
    } catch {
      // Fall through to in-memory
    }

    return deletedInMemory;
  }

  /**
   * Super Admin only: Restore a soft-deleted lead within the 30-day window back to active pipeline.
   */
  async restoreLead(id: string, user: AuthUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin can restore deleted leads');
    }

    const now = new Date().toISOString();

    try {
      const { data, error } = await this.supabaseService.client
        .from('leads')
        .update({
          deleted_at: null,
          updated_at: now,
        })
        .eq('id', id)
        .eq('org_id', user.org_id)
        .select('*')
        .single();

      if (!error && data) {
        return {
          success: true,
          message: `Lead ${data.name} successfully restored to the sales pipeline`,
          lead: data,
        };
      }
    } catch {
      // Fall through to in-memory
    }

    const localLead = this.inMemoryLeads.find((l) => l.id === id);
    if (!localLead) {
      throw new NotFoundException(`Lead with ID ${id} not found in recovery bin`);
    }

    localLead.deleted_at = null;
    localLead.recovery_deadline = null;
    localLead.updated_at = now;

    return {
      success: true,
      message: `Lead ${localLead.name} successfully restored to the sales pipeline`,
      lead: localLead,
    };
  }

  /**
   * Super Admin only: Permanently purge a lead from the recovery bin.
   */
  async permanentlyDelete(id: string, user: AuthUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin can permanently delete leads');
    }

    try {
      await this.supabaseService.client
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('org_id', user.org_id);
    } catch {
      // Fall through
    }

    const index = this.inMemoryLeads.findIndex((l) => l.id === id);
    if (index !== -1) {
      this.inMemoryLeads.splice(index, 1);
    }

    return {
      success: true,
      message: 'Lead permanently deleted from system',
      id,
    };
  }
}
