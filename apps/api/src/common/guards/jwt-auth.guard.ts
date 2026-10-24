import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';

export interface ImpersonatorInfo {
  id: string;
  full_name?: string;
  role: string;
}

/** Development-only demo identities, mirroring supabase/seed.sql. */
const DEMO_ORG_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_IDENTITIES: Record<string, { id: string; email: string; full_name: string }> = {
  super_admin: { id: '22222222-2222-2222-2222-222222222221', email: 'admin@kyrossolar.com', full_name: 'Kishan' },
  sales_admin: { id: '22222222-2222-2222-2222-222222222222', email: 'sales.lead@kyrossolar.com', full_name: 'Vikram Deshmukh' },
  telecaller: { id: '22222222-2222-2222-2222-222222222223', email: 'telecaller1@kyrossolar.com', full_name: 'Sneha Patil' },
  sales_exec: { id: '22222222-2222-2222-2222-222222222225', email: 'exec1@kyrossolar.com', full_name: 'Rohan Mehta' },
  surveyor: { id: '22222222-2222-2222-2222-222222222227', email: 'surveyor1@kyrossolar.com', full_name: 'Sachin Shinde' },
  installer: { id: '22222222-2222-2222-2222-222222222228', email: 'installer1@kyrossolar.com', full_name: 'Ganesh Pawar' },
  accounts: { id: '22222222-2222-2222-2222-222222222229', email: 'accounts@kyrossolar.com', full_name: 'Meera Iyer' },
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  private demoAuthEnabled(): boolean {
    return (
      process.env.ENABLE_DEMO_AUTH === 'true' &&
      process.env.NODE_ENV !== 'production'
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    // Development-only demo tokens. Gated behind ENABLE_DEMO_AUTH so a production
    // deployment can never accept them. The identity is resolved from an allow-list
    // rather than trusting any role name embedded in the token.
    if (token.startsWith('demo-token-') && this.demoAuthEnabled()) {
      const role = token.replace('demo-token-', '');
      const demoIdentity = DEMO_IDENTITIES[role];
      if (!demoIdentity) {
        throw new UnauthorizedException('Unknown demo role');
      }
      request.user = {
        id: demoIdentity.id,
        email: demoIdentity.email,
        org_id: DEMO_ORG_ID,
        role,
        full_name: demoIdentity.full_name,
        impersonator: null,
      };
      return true;
    }

    try {
      const {
        data: { user },
        error,
      } = await this.supabaseService.client.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid or expired authentication token');
      }

      // Fetch user profile and organization info
      const { data: profile } = await this.supabaseService.client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.is_active) {
        throw new UnauthorizedException('User account is deactivated or unauthorized');
      }

      // Super Admin "child login" (impersonation) marker. Only ever trusted when
      // minted server-side through POST /auth/impersonate, which requires a real
      // super_admin session. The record carries the original admin so the child
      // session can navigate back with POST /auth/switch-back.
      const impersonator = (user.app_metadata as Record<string, any> | undefined)
        ?._impersonatedBy as ImpersonatorInfo | undefined;

      request.user = {
        id: user.id,
        email: user.email,
        org_id: profile.org_id,
        role: profile.role,
        team_id: profile.team_id,
        full_name: profile.full_name,
        impersonator: impersonator || null,
      };

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Authentication verification failed');
    }
  }
}
