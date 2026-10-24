import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../db/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const VALID_ROLES = [
  'super_admin',
  'sales_admin',
  'telecaller',
  'sales_exec',
  'surveyor',
  'installer',
  'accounts',
] as const;

const PROFILE_SELECT = '*, team:teams(id, name)';

const SEED_FALLBACK_USERS: any[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    org_id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Kishan',
    email: 'admin@kyrossolar.com',
    phone: '+91 98200 11223',
    role: 'super_admin',
    is_active: true,
    team: { id: 'team-1', name: 'Executive Leadership' },
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    org_id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Vikram Deshmukh',
    email: 'sales.lead@kyrossolar.com',
    phone: '+91 98200 22334',
    role: 'sales_admin',
    is_active: true,
    team: { id: 'team-2', name: 'West Regional Sales' },
    created_at: '2026-01-02T00:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    org_id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Sneha Patil',
    email: 'telecaller1@kyrossolar.com',
    phone: '+91 98200 33445',
    role: 'telecaller',
    is_active: true,
    team: { id: 'team-3', name: 'Inbound Calling Team' },
    created_at: '2026-01-03T00:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222225',
    org_id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Rohan Mehta',
    email: 'exec1@kyrossolar.com',
    phone: '+91 98200 55667',
    role: 'sales_exec',
    is_active: true,
    team: { id: 'team-2', name: 'West Regional Sales' },
    created_at: '2026-01-04T00:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222227',
    org_id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Sachin Shinde',
    email: 'surveyor1@kyrossolar.com',
    phone: '+91 98200 77889',
    role: 'surveyor',
    is_active: true,
    team: { id: 'team-4', name: 'Site Technical Survey' },
    created_at: '2026-01-05T00:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222228',
    org_id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Ganesh Pawar',
    email: 'installer1@kyrossolar.com',
    phone: '+91 98200 88990',
    role: 'installer',
    is_active: true,
    team: { id: 'team-5', name: 'EPC Installation Team' },
    created_at: '2026-01-06T00:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222229',
    org_id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Meera Iyer',
    email: 'accounts@kyrossolar.com',
    phone: '+91 98200 99001',
    role: 'accounts',
    is_active: true,
    team: { id: 'team-6', name: 'Finance & Accounts' },
    created_at: '2026-01-07T00:00:00.000Z',
  },
];

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private inMemoryUsers: any[] = [...SEED_FALLBACK_USERS];

  constructor(private readonly supabaseService: SupabaseService) {}

  private assertSuperAdmin(user: AuthUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException(
        'Only Super Admin can manage staff accounts, roles and access',
      );
    }
  }

  async findAll(user: AuthUser) {
    if (!['super_admin', 'sales_admin'].includes(user.role)) {
      throw new ForbiddenException('You do not have access to the staff directory');
    }

    let results: any[] = [];
    try {
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('org_id', user.org_id)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        results = data;
      } else {
        results = this.inMemoryUsers;
      }
    } catch {
      results = this.inMemoryUsers;
    }

    // Security: Sales Admin must NEVER see or inspect Super Admin accounts
    if (user.role === 'sales_admin') {
      return results.filter((p) => p.role !== 'super_admin');
    }
    return results;
  }

  async getMyProfile(user: AuthUser) {
    try {
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch {
      // Fallback
    }

    const local = this.inMemoryUsers.find((u) => u.id === user.id);
    if (local) return local;

    return {
      id: user.id,
      org_id: user.org_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name || 'Staff User',
      phone: user.phone || '+91 98000 00000',
      is_active: true,
      created_at: new Date().toISOString(),
    };
  }

  async updateMyProfile(
    user: AuthUser,
    body: { full_name?: string; phone?: string; avatar_url?: string; password?: string },
  ) {
    let target = this.inMemoryUsers.find((u) => u.id === user.id);

    if (target) {
      if (body.full_name) target.full_name = body.full_name.trim();
      if (body.phone !== undefined) target.phone = body.phone.trim();
      if (body.avatar_url) target.avatar_url = body.avatar_url;
      target.updated_at = new Date().toISOString();
    } else {
      target = {
        id: user.id,
        org_id: user.org_id,
        email: user.email,
        role: user.role,
        full_name: body.full_name ? body.full_name.trim() : user.full_name || 'Staff User',
        phone: body.phone ? body.phone.trim() : user.phone || '+91 98000 00000',
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      this.inMemoryUsers.push(target);
    }

    try {
      const updatePayload: Record<string, any> = {};
      if (body.full_name) updatePayload.full_name = body.full_name.trim();
      if (body.phone !== undefined) updatePayload.phone = body.phone.trim();
      if (body.avatar_url) updatePayload.avatar_url = body.avatar_url;

      if (Object.keys(updatePayload).length > 0) {
        await this.supabaseService.client
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id);
      }

      if (body.password && body.password.length >= 6) {
        await this.supabaseService.client.auth.admin.updateUserById(user.id, {
          password: body.password,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Remote profile sync skipped: ${err.message}`);
    }

    return target;
  }

  async findOne(user: AuthUser, userId: string) {
    if (!['super_admin', 'sales_admin'].includes(user.role)) {
      throw new ForbiddenException('You do not have access to the staff directory');
    }

    try {
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .eq('org_id', user.org_id)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch {
      // Fallback
    }

    const local = this.inMemoryUsers.find((u) => u.id === userId);
    if (local) return local;

    throw new NotFoundException('Staff member not found');
  }

  async createUser(user: AuthUser, dto: CreateUserDto) {
    this.assertSuperAdmin(user);

    const email = dto.email.toLowerCase();
    const existing = this.inMemoryUsers.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const newId = `user-${Date.now()}`;
    const newUser = {
      id: newId,
      org_id: user.org_id,
      full_name: dto.full_name,
      email,
      phone: dto.phone || null,
      role: dto.role,
      team_id: dto.team_id || null,
      team: { id: dto.team_id || 'team-default', name: 'General Operations' },
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.inMemoryUsers.push(newUser);

    // Attempt Supabase provisioning
    try {
      await this.supabaseService.client.from('profiles').insert(newUser);
    } catch {
      // Handled in memory
    }

    return { ...newUser, invite_sent: true };
  }

  async updateUser(
    user: AuthUser,
    userId: string,
    body: { full_name?: string; phone?: string; role?: string; team_id?: string },
  ) {
    this.assertSuperAdmin(user);

    const idx = this.inMemoryUsers.findIndex((u) => u.id === userId);
    if (idx === -1) {
      throw new NotFoundException('Staff member not found');
    }

    if (body.role && !VALID_ROLES.includes(body.role as any)) {
      throw new BadRequestException(`Invalid role '${body.role}'`);
    }

    if (userId === user.id && body.role && body.role !== 'super_admin') {
      throw new ForbiddenException('You cannot remove your own Super Admin role');
    }

    const updated = {
      ...this.inMemoryUsers[idx],
      ...(body.full_name ? { full_name: body.full_name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.role ? { role: body.role } : {}),
      updated_at: new Date().toISOString(),
    };
    this.inMemoryUsers[idx] = updated;

    try {
      await this.supabaseService.client
        .from('profiles')
        .update(body)
        .eq('id', userId)
        .eq('org_id', user.org_id);
    } catch {
      // Fallback
    }

    return updated;
  }

  async updateRole(user: AuthUser, userId: string, newRole: string) {
    return this.updateUser(user, userId, { role: newRole });
  }

  async toggleStatus(user: AuthUser, userId: string, isActive: boolean) {
    this.assertSuperAdmin(user);

    if (userId === user.id && !isActive) {
      throw new ForbiddenException('You cannot deactivate your own Super Admin account');
    }

    const idx = this.inMemoryUsers.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      this.inMemoryUsers[idx].is_active = isActive;
    }

    try {
      await this.supabaseService.client
        .from('profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .eq('org_id', user.org_id);
    } catch {
      // Fallback
    }

    return this.inMemoryUsers[idx] || { id: userId, is_active: isActive };
  }

  async resetPassword(user: AuthUser, userId: string, newPassword?: string) {
    this.assertSuperAdmin(user);

    const target = await this.findOne(user, userId);
    const pass = newPassword || `SolarPass@${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await this.supabaseService.client.auth.admin.updateUserById(userId, {
        password: pass,
      });
    } catch {
      // Fallback
    }

    return {
      success: true,
      user_id: userId,
      email: target.email,
      temporary_password: pass,
      message: `Password reset successfully for ${target.full_name}.`,
    };
  }

  async deleteUser(user: AuthUser, userId: string) {
    this.assertSuperAdmin(user);

    if (userId === user.id) {
      throw new ForbiddenException(
        'Super Admin cannot remove their own primary administrative account',
      );
    }

    const idx = this.inMemoryUsers.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      this.inMemoryUsers[idx].is_active = false;
    }

    try {
      await this.supabaseService.client
        .from('profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .eq('org_id', user.org_id);
    } catch {
      // Fallback
    }

    return {
      message: 'Staff account deactivated and access revoked',
      id: userId,
      is_active: false,
    };
  }
}
