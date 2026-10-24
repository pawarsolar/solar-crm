import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { SupabaseService } from '../../db/supabase.service';

/** Features every authenticated staff member keeps even with no explicit grant. */
const BASELINE_FEATURES = ['leads', 'kpi_dashboard'];

export const MEMORY_FEATURE_GRANTS: Record<string, boolean> = {
  // super_admin
  'super_admin|leads': true,
  'super_admin|bulk_import': true,
  'super_admin|export_excel': true,
  'super_admin|export_pdf': true,
  'super_admin|quotation': true,
  'super_admin|payments': true,
  'super_admin|survey': true,
  'super_admin|installation': true,
  'super_admin|subsidy': true,
  'super_admin|reports': true,
  'super_admin|report_share': true,
  'super_admin|kpi_dashboard': true,
  'super_admin|service_tickets': true,
  'super_admin|whatsapp': true,
  'super_admin|deletion_request': true,
  'super_admin|user_management': true,

  // sales_admin defaults
  'sales_admin|leads': true,
  'sales_admin|bulk_import': true,
  'sales_admin|export_excel': true,
  'sales_admin|export_pdf': true,
  'sales_admin|quotation': true,
  'sales_admin|payments': true,
  'sales_admin|survey': true,
  'sales_admin|installation': true,
  'sales_admin|subsidy': true,
  'sales_admin|reports': true,
  'sales_admin|report_share': true,
  'sales_admin|kpi_dashboard': true,
  'sales_admin|service_tickets': true,
  'sales_admin|whatsapp': true,
  'sales_admin|deletion_request': true,
  'sales_admin|user_management': false,

  // telecaller defaults
  'telecaller|leads': true,
  'telecaller|kpi_dashboard': true,
  'telecaller|whatsapp': true,
  'telecaller|telecalling': true,
  'telecaller|quotation': false,
  'telecaller|bulk_import': false,

  // sales_exec defaults
  'sales_exec|leads': true,
  'sales_exec|quotation': true,
  'sales_exec|survey': true,
  'sales_exec|payments': true,
  'sales_exec|kpi_dashboard': true,
  'sales_exec|whatsapp': true,
  'sales_exec|deletion_request': true,

  // surveyor defaults
  'surveyor|survey': true,
  'surveyor|leads': true,
  'surveyor|kpi_dashboard': true,

  // installer defaults
  'installer|installation': true,
  'installer|survey': true,
  'installer|leads': true,
  'installer|kpi_dashboard': true,

  // accounts defaults
  'accounts|payments': true,
  'accounts|subsidy': true,
  'accounts|reports': true,
  'accounts|export_excel': true,
  'accounts|kpi_dashboard': true,
};

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User session required for feature access');
    }

    // Super admin bypasses all feature locks.
    if (user.role === 'super_admin') {
      return true;
    }

    const isEnabled = await this.resolveFeatureFlag(
      user.org_id,
      user.id,
      user.role,
      requiredFeature,
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        `Feature '${requiredFeature}' is disabled for your account/role`,
      );
    }

    return true;
  }

  /**
   * Resolves feature flag via user override -> role default -> org default.
   */
  async resolveFeatureFlag(
    orgId: string,
    userId: string,
    role: string,
    featureKey: string,
  ): Promise<boolean> {
    try {
      const { data: grants, error } = await this.supabaseService.client
        .from('feature_grants')
        .select('scope, scope_value, enabled')
        .eq('org_id', orgId)
        .eq('feature_key', featureKey);

      if (!error && grants && grants.length > 0) {
        // 1. Check user override
        const userGrant = grants.find(
          (g) => g.scope === 'user' && g.scope_value === userId,
        );
        if (userGrant !== undefined) return userGrant.enabled;

        // 2. Check role default
        const roleGrant = grants.find(
          (g) => g.scope === 'role' && g.scope_value === role,
        );
        if (roleGrant !== undefined) return roleGrant.enabled;

        // 3. Check org default
        const orgGrant = grants.find((g) => g.scope === 'org');
        if (orgGrant !== undefined) return orgGrant.enabled;
      }
    } catch {
      // Fall through to memory check
    }

    // Check in-memory grants for user override then role default
    const userMemoryKey = `${userId}|${featureKey}`;
    if (userMemoryKey in MEMORY_FEATURE_GRANTS) {
      return MEMORY_FEATURE_GRANTS[userMemoryKey];
    }

    const roleMemoryKey = `${role}|${featureKey}`;
    if (roleMemoryKey in MEMORY_FEATURE_GRANTS) {
      return MEMORY_FEATURE_GRANTS[roleMemoryKey];
    }

    return BASELINE_FEATURES.includes(featureKey);
  }

  /** Resolve every feature flag for a user in one round-trip (used by /auth/me). */
  async resolveAllFeatureFlags(
    orgId: string,
    userId: string,
    role: string,
  ): Promise<Record<string, boolean>> {
    try {
      const { data: features } = await this.supabaseService.client
        .from('features')
        .select('key');

      const { data: grants, error } = await this.supabaseService.client
        .from('feature_grants')
        .select('scope, scope_value, feature_key, enabled')
        .eq('org_id', orgId);

      const resolved: Record<string, boolean> = {};

      for (const feature of features || []) {
        const scoped = (grants || []).filter((g) => g.feature_key === feature.key);
        const userGrant = scoped.find((g) => g.scope === 'user' && g.scope_value === userId);
        const roleGrant = scoped.find((g) => g.scope === 'role' && g.scope_value === role);
        const orgGrant = scoped.find((g) => g.scope === 'org');

        const value =
          userGrant?.enabled ??
          roleGrant?.enabled ??
          orgGrant?.enabled ??
          BASELINE_FEATURES.includes(feature.key);

        resolved[feature.key] = value;
      }

      if (error && Object.keys(resolved).length === 0) {
        return {};
      }

      return resolved;
    } catch {
      return {};
    }
  }
}
