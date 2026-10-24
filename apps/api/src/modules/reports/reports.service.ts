import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ReportsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Hashes token using SHA-256 for secure storage lookup
   */
  hashToken(token: string): string {
    const salt = process.env.REPORT_SHARE_SALT || 'salt_solar_report_2026';
    return crypto.createHmac('sha256', salt).update(token).digest('hex');
  }

  async getSummary(user: AuthUser, range: { from?: string; to?: string } = {}) {
    const from = range.from || null;
    const to = range.to || null;

    // Tenant-scoped aggregate over the raw-SQL pool: `withTenant` pins the RLS
    // identity so the privileged connection cannot read another org's pipeline.
    const rows = await this.supabaseService.withTenant(user, (c) =>
      c
        .query(
          `select
             count(*)::int                                          as total_leads,
             count(*) filter (where stage = 'BOOKED')::int           as booked,
             count(*) filter (where stage = 'COMMISSIONED')::int     as commissioned,
             count(*) filter (where stage = 'LOST')::int             as lost,
             coalesce(sum(value_estimate) filter (where stage in ('BOOKED','COMMISSIONED')), 0)::numeric as booked_value,
             coalesce(sum(system_kw) filter (where stage = 'COMMISSIONED'), 0)::numeric as commissioned_kw
           from leads
           where org_id = $1
             and deleted_at is null
             and ($2::date is null or created_at::date >= $2::date)
             and ($3::date is null or created_at::date <= $3::date)`,
          [user.org_id, from, to],
        )
        .then((r) => r.rows),
    );

    const agg = rows[0] || {};
    const totalLeads = Number(agg.total_leads || 0);
    const booked = Number(agg.booked || 0);

    return {
      range: { from, to },
      totals: {
        totalLeads,
        booked,
        commissioned: Number(agg.commissioned || 0),
        lost: Number(agg.lost || 0),
        bookedValue: Number(agg.booked_value || 0),
        commissionedKw: Number(agg.commissioned_kw || 0),
        conversionRate: totalLeads ? Number(((booked / totalLeads) * 100).toFixed(1)) : 0,
      },
    };
  }

  async createShareLink(
    user: AuthUser,
    body: { report: string; expiresInDays?: number; params?: any },
  ) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const days = body.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { data, error } = await this.supabaseService.client
      .from('report_shares')
      .insert({
        org_id: user.org_id,
        report: body.report || 'pipeline_summary',
        params: body.params || {},
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      shareUrl: `/public/reports/${rawToken}`,
      token: rawToken,
      expiresAt: data.expires_at,
    };
  }

  async getPublicReport(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const { data: share } = await this.supabaseService.client
      .from('report_shares')
      .select('*, org:orgs(name)')
      .eq('token_hash', tokenHash)
      .single();

    if (!share) {
      throw new NotFoundException('Invalid or expired report share link');
    }

    if (new Date(share.expires_at) < new Date()) {
      throw new BadRequestException('This shared report link has expired');
    }

    // Retrieve pipeline leads with masked PII
    const { data: leads } = await this.supabaseService.client
      .from('leads')
      .select('name, phone, email, city, system_kw, stage, value_estimate, created_at')
      .eq('org_id', share.org_id)
      .is('deleted_at', null)
      .limit(100);

    const maskedLeads = (leads || []).map((l) => ({
      name: l.name,
      phone: l.phone ? `${l.phone.slice(0, 5)}*****${l.phone.slice(-2)}` : '-',
      email: l.email ? `${l.email[0]}*****@${l.email.split('@')[1]}` : '-',
      city: l.city,
      system_kw: l.system_kw,
      stage: l.stage,
      value_estimate: l.value_estimate,
      created_at: l.created_at,
    }));

    return {
      organization: share.org?.name,
      reportName: share.report,
      expiresAt: share.expires_at,
      leads: maskedLeads,
    };
  }
}
