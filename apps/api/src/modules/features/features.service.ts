import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { MEMORY_FEATURE_GRANTS } from '../../common/guards/feature.guard';

const ASSIGNABLE_ROLES = [
  'super_admin',
  'sales_admin',
  'telecaller',
  'sales_exec',
  'surveyor',
  'installer',
  'accounts',
] as const;

export const DEFAULT_FEATURES = [
  { key: 'leads', label: 'Inbound Leads & Pipeline CRM', description: 'Access to lead cards, qualification, and stage progression' },
  { key: 'bulk_import', label: 'Bulk Lead Importer (.csv & .xlsx)', description: 'Batch upload prospective customer sheets into CRM' },
  { key: 'export_excel', label: 'Export Pipeline to Excel', description: 'Download complete pipeline and deal metrics as .xlsx' },
  { key: 'export_pdf', label: 'Export Pipeline to PDF', description: 'Generate executive summary reports in printable PDF' },
  { key: 'quotation', label: 'Solar Quotation & Sizing Engine', description: 'Precision sizing calculator and customer proposals' },
  { key: 'payments', label: 'Payment Milestone Tracking', description: 'Track customer advances, dispatch, and final settlement' },
  { key: 'survey', label: 'Site Feasibility Surveys', description: 'Record shadow analysis, roof photos, and structure specs' },
  { key: 'installation', label: 'EPC Installation Milestones', description: 'Track structure fabrication, wiring, and commissioning' },
  { key: 'subsidy', label: 'PM Surya Ghar Subsidy Processing', description: 'Manage national portal consumer subsidy application states' },
  { key: 'reports', label: 'Operational & Financial Reports', description: 'Access pipeline analytics, closure rates, and revenue reports' },
  { key: 'report_share', label: 'Public Report Share Links', description: 'Generate read-only shareable links for stakeholders' },
  { key: 'kpi_dashboard', label: 'KPI Dashboard & Analytics', description: 'High-level business performance and conversion metrics' },
  { key: 'service_tickets', label: 'Service & Post-Install Tickets', description: 'Manage customer complaints and warranty inverter servicing' },
  { key: 'whatsapp', label: 'Automated WhatsApp Notifications', description: 'Send proposal and milestone updates directly to consumer' },
  { key: 'deletion_request', label: 'Request Lead Deletion', description: 'Request removal of accidental or duplicate lead entries' },
  { key: 'user_management', label: 'Staff & Role Management', description: 'Super Admin provisioning of users, roles, and access rights' },
];

@Injectable()
export class FeaturesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Full feature matrix for the Super Admin console: the feature registry, every
   * role-level grant, plus the per-user overrides. Only the Super Admin sees the
   * complete org-wide picture; other admins get the feature list for route guards.
   */
  async getMatrix(user: AuthUser) {
    let features: any[] = DEFAULT_FEATURES;
    try {
      const { data, error } = await this.supabaseService.client
        .from('features')
        .select('*')
        .order('key');
      if (!error && data && data.length > 0) {
        features = data;
      }
    } catch {
      // Fallback to DEFAULT_FEATURES
    }

    let grants: any[] = [];
    try {
      const { data, error } = await this.supabaseService.client
        .from('feature_grants')
        .select('*')
        .eq('org_id', user.org_id);
      if (!error && data) {
        grants = data;
      }
    } catch {
      // Fallback
    }

    const allFeatureKeys = features.map((f) => f.key);

    if (user.role !== 'super_admin') {
      const own: Record<string, boolean> = {};
      for (const key of allFeatureKeys) {
        const memKey = `${user.role}|${key}`;
        own[key] = memKey in MEMORY_FEATURE_GRANTS ? MEMORY_FEATURE_GRANTS[memKey] : ['leads', 'kpi_dashboard'].includes(key);
      }
      return { features, grants: [], resolved: own };
    }

    return {
      features,
      grants,
      roles: ASSIGNABLE_ROLES,
      matrix: this.buildMatrix(allFeatureKeys, grants),
    };
  }

  private buildMatrix(featureKeys: string[], grants: any[]) {
    const matrix: Record<string, Record<string, boolean>> = {};
    for (const role of ASSIGNABLE_ROLES) {
      matrix[role] = {};
      for (const key of featureKeys) {
        if (role === 'super_admin') {
          matrix[role][key] = true;
          continue;
        }

        const grant = grants.find(
          (g) => g.feature_key === key && g.scope === 'role' && g.scope_value === role,
        );

        if (grant !== undefined) {
          matrix[role][key] = grant.enabled;
        } else {
          const memKey = `${role}|${key}`;
          matrix[role][key] = memKey in MEMORY_FEATURE_GRANTS ? MEMORY_FEATURE_GRANTS[memKey] : false;
        }
      }
    }
    return matrix;
  }

  async getGrants(user: AuthUser) {
    try {
      const { data } = await this.supabaseService.client
        .from('feature_grants')
        .select('*')
        .eq('org_id', user.org_id);
      if (data) return { grants: data };
    } catch {
      // Fallback
    }
    return { grants: [] };
  }

  async updateGrant(
    user: AuthUser,
    body: {
      scope: 'org' | 'role' | 'user';
      scope_value: string;
      feature_key: string;
      enabled: boolean;
    },
  ) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin can grant or revoke feature access');
    }

    const { scope, scope_value, feature_key, enabled } = body;

    if (!['org', 'role', 'user'].includes(scope)) {
      throw new BadRequestException(`Invalid grant scope '${scope}'`);
    }
    if (!scope_value) {
      throw new BadRequestException('A scope_value (role name or user id) is required');
    }
    if (!feature_key) {
      throw new BadRequestException('A feature_key is required');
    }
    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean');
    }

    // Always update in-memory grants for instant zero-latency enforcement
    const memoryKey = `${scope_value}|${feature_key}`;
    MEMORY_FEATURE_GRANTS[memoryKey] = enabled;

    let dbGrant = null;
    try {
      const { data, error } = await this.supabaseService.client
        .from('feature_grants')
        .upsert(
          {
            org_id: user.org_id,
            scope,
            scope_value,
            feature_key,
            enabled,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          { onConflict: 'org_id, scope, scope_value, feature_key' },
        )
        .select()
        .single();

      if (!error) dbGrant = data;
    } catch {
      // Memory persistence is authoritative
    }

    return {
      grant: dbGrant || { scope, scope_value, feature_key, enabled },
      message: `${feature_key} ${enabled ? 'granted to' : 'revoked from'} ${scope}:${scope_value}`,
    };
  }

  async bulkUpdateGrants(
    user: AuthUser,
    body: {
      changes: Array<{
        scope: 'org' | 'role' | 'user';
        scope_value: string;
        feature_key: string;
        enabled: boolean;
      }>;
    },
  ) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin can grant or revoke feature access');
    }
    if (!Array.isArray(body.changes) || body.changes.length === 0) {
      throw new BadRequestException('No changes supplied');
    }

    const results: any[] = [];
    for (const change of body.changes) {
      const result = await this.updateGrant(user, change);
      results.push(result.grant);
    }
    return { updated: results.length, grants: results };
  }
}
