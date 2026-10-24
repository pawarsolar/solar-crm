import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { LoginDto } from './dto/login.dto';
import { ImpersonateDto } from './dto/impersonate.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

interface DemoUser {
  role: string;
  name: string;
  id: string;
}

const ALL_FEATURES = [
  'leads',
  'telecalling',
  'bulk_import',
  'export_excel',
  'export_pdf',
  'quotation',
  'payments',
  'survey',
  'installation',
  'subsidy',
  'reports',
  'report_share',
  'kpi_dashboard',
  'service_tickets',
  'whatsapp',
];

function featureSet(enabled: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of ALL_FEATURES) out[key] = enabled.includes(key);
  return out;
}

/**
 * Offline role defaults, mirroring supabase/seed.sql section 5. Used only when the
 * database cannot be reached so the app stays demonstrable without a live project.
 */
const FALLBACK_ROLE_FEATURES: Record<string, Record<string, boolean>> = {
  super_admin: featureSet(ALL_FEATURES),
  sales_admin: featureSet([
    'leads', 'telecalling', 'bulk_import', 'export_excel', 'export_pdf', 'quotation',
    'payments', 'survey', 'installation', 'reports', 'kpi_dashboard', 'service_tickets', 'whatsapp',
  ]),
  telecaller: featureSet(['leads', 'telecalling', 'kpi_dashboard', 'whatsapp']),
  sales_exec: featureSet(['leads', 'quotation', 'survey', 'kpi_dashboard', 'whatsapp']),
  surveyor: featureSet(['leads', 'survey', 'kpi_dashboard']),
  installer: featureSet(['leads', 'installation', 'kpi_dashboard', 'service_tickets']),
  accounts: featureSet([
    'export_excel', 'export_pdf', 'payments', 'subsidy', 'reports', 'kpi_dashboard', 'whatsapp',
  ]),
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly featureGuard: FeatureGuard,
  ) {}

  /**
   * Demo logins bypass Supabase Auth entirely, so they are only available when
   * the operator explicitly opts in with ENABLE_DEMO_AUTH=true outside production.
   * This keeps the offline demo usable without shipping an authentication backdoor.
   */
  private demoAuthEnabled(): boolean {
    return (
      process.env.ENABLE_DEMO_AUTH === 'true' &&
      process.env.NODE_ENV !== 'production'
    );
  }

  private readonly demoUsers: Record<string, DemoUser> = {
    'admin@kyrossolar.com': { role: 'super_admin', name: 'Kishan', id: '22222222-2222-2222-2222-222222222221' },
    'sales.lead@kyrossolar.com': { role: 'sales_admin', name: 'Vikram Deshmukh', id: '22222222-2222-2222-2222-222222222222' },
    'telecaller1@kyrossolar.com': { role: 'telecaller', name: 'Sneha Patil', id: '22222222-2222-2222-2222-222222222223' },
    'telecaller2@kyrossolar.com': { role: 'telecaller', name: 'Amit Kulkarni', id: '22222222-2222-2222-2222-222222222224' },
    'exec1@kyrossolar.com': { role: 'sales_exec', name: 'Rohan Mehta', id: '22222222-2222-2222-2222-222222222225' },
    'exec2@kyrossolar.com': { role: 'sales_exec', name: 'Pooja Joshi', id: '22222222-2222-2222-2222-222222222226' },
    'surveyor1@kyrossolar.com': { role: 'surveyor', name: 'Sachin Shinde', id: '22222222-2222-2222-2222-222222222227' },
    'installer1@kyrossolar.com': { role: 'installer', name: 'Ganesh Pawar', id: '22222222-2222-2222-2222-222222222228' },
    'accounts@kyrossolar.com': { role: 'accounts', name: 'Meera Iyer', id: '22222222-2222-2222-2222-222222222229' },
  };

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (this.demoAuthEnabled() && this.demoUsers[email]) {
      return this.demoLogin(email, this.demoUsers[email]);
    }

    // Authenticate through Supabase Auth
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { data: profile } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!profile || !profile.is_active) {
      throw new UnauthorizedException('Account disabled or unassigned');
    }

    const features = await this.resolveFeatures(profile.org_id, profile.id, profile.role);

    return this.buildSession(data.session.access_token, profile, features, null);
  }

  private async demoLogin(email: string, demoUser: DemoUser) {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const features = await this.resolveFeatures(orgId, demoUser.id, demoUser.role);

    return this.buildSession(
      `demo-token-${demoUser.role}`,
      {
        id: demoUser.id,
        email,
        org_id: orgId,
        role: demoUser.role,
        full_name: demoUser.name,
      },
      features,
      null,
    );
  }

  private buildSession(
    token: string,
    profile: {
      id: string;
      email: string;
      org_id: string;
      role: string;
      full_name?: string;
      team_id?: string | null;
    },
    features: Record<string, boolean>,
    impersonator: { id: string; full_name?: string; role: string } | null,
  ) {
    return {
      token,
      user: {
        id: profile.id,
        email: profile.email,
        org_id: profile.org_id,
        role: profile.role,
        full_name: profile.full_name,
        team_id: profile.team_id,
      },
      features,
      impersonator,
    };
  }

  private async resolveFeatures(orgId: string, userId: string, role: string) {
    if (role === 'super_admin') {
      // Super Admin owns every capability by definition.
      const { data: features } = await this.supabaseService.client
        .from('features')
        .select('key');
      const all: Record<string, boolean> = {};
      (features || []).forEach((f) => {
        all[f.key] = true;
      });
      if (Object.keys(all).length > 0) return all;
      return { ...FALLBACK_ROLE_FEATURES.super_admin };
    }

    const resolved = await this.featureGuard.resolveAllFeatureFlags(orgId, userId, role);
    if (Object.keys(resolved).length > 0) return resolved;

    // Database unreachable/not migrated: fall back to the documented role defaults
    // so the app remains demonstrable offline instead of locking everyone out.
    return { ...(FALLBACK_ROLE_FEATURES[role] || FALLBACK_ROLE_FEATURES.sales_exec) };
  }

  /**
   * Super Admin "child login". Issues a genuine Supabase session for the target
   * staff user (so RLS and audit trails behave exactly as if that user signed in)
   * and stamps `_impersonatedBy` into app_metadata so the UI can offer a
   * highlighted "Back to Super Admin" control.
   */
  async impersonate(admin: AuthUser, dto: ImpersonateDto) {
    if (admin.role !== 'super_admin') {
      throw new ForbiddenException('Only Super Admin can start a child login session');
    }
    if (admin.impersonator) {
      throw new ForbiddenException('Nested child login is not permitted');
    }
    if (dto.user_id === admin.id) {
      throw new BadRequestException('You are already signed in as your own account');
    }

    const { data: target, error: targetError } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', dto.user_id)
      .single();

    if (targetError || !target) {
      throw new NotFoundException('Target staff member not found');
    }
    if (target.org_id !== admin.org_id) {
      throw new ForbiddenException('Target staff member belongs to another organization');
    }
    if (!target.is_active) {
      throw new BadRequestException('Target staff member is deactivated');
    }

    const { data: link, error: linkError } =
      await this.supabaseService.client.auth.admin.generateLink({
        type: 'magiclink',
        email: target.email,
        options: {
          data: {
            _impersonatedBy: {
              id: admin.id,
              full_name: admin.full_name,
              role: admin.role,
            },
          },
        },
      });

    if (linkError) {
      this.logger.warn(`Impersonation link generation failed: ${linkError.message}`);
      throw new BadRequestException(
        'Unable to start a child login session for this account (auth identity missing)',
      );
    }

    const { data: verified, error: verifyError } =
      await this.supabaseService.client.auth.verifyOtp({
        type: 'magiclink',
        token_hash: link.properties.hashed_token,
      });

    if (verifyError || !verified.session) {
      throw new BadRequestException('Unable to establish the child login session');
    }

    const features = await this.resolveFeatures(
      target.org_id,
      target.id,
      target.role,
    );

    return {
      ...this.buildSession(verified.session.access_token, target, features, {
        id: admin.id,
        full_name: admin.full_name,
        role: admin.role,
      }),
      profile: target,
    };
  }

  /**
   * Return from a child login session. The child session already carries the
   * original super admin identity in app_metadata, so we mint a fresh session
   * for that admin rather than trying to un-impersonate in place.
   */
  async switchBack(child: AuthUser) {
    if (!child.impersonator?.id) {
      throw new BadRequestException('This session is not a child login session');
    }

    const { data: admin, error: adminError } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', child.impersonator.id)
      .single();

    if (adminError || !admin) {
      throw new NotFoundException('Originating Super Admin account no longer exists');
    }
    if (admin.role !== 'super_admin' || !admin.is_active) {
      throw new ForbiddenException('Originating Super Admin account is no longer active');
    }

    const { data: link, error: linkError } =
      await this.supabaseService.client.auth.admin.generateLink({
        type: 'magiclink',
        email: admin.email,
      });

    if (linkError) {
      throw new BadRequestException('Unable to return to the Super Admin session');
    }

    const { data: verified, error: verifyError } =
      await this.supabaseService.client.auth.verifyOtp({
        type: 'magiclink',
        token_hash: link.properties.hashed_token,
      });

    if (verifyError || !verified.session) {
      throw new BadRequestException('Unable to re-establish the Super Admin session');
    }

    const features = await this.resolveFeatures(admin.org_id, admin.id, admin.role);

    return this.buildSession(verified.session.access_token, admin, features, null);
  }

  async getMe(user: AuthUser) {
    const { data: profile } = await this.supabaseService.client
      .from('profiles')
      .select('*, org:orgs(name)')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const features = await this.resolveFeatures(profile.org_id, profile.id, profile.role);

    return {
      user: profile,
      features,
      impersonator: user.impersonator || null,
    };
  }
}
