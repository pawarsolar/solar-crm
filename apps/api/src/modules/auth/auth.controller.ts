import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ImpersonateDto } from './dto/impersonate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Tighter than the global 100/min budget to blunt credential-stuffing attempts. */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip) || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    return this.authService.login(loginDto, {
      ip,
      userAgent,
      headers: req.headers,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user);
  }

  /** Super Admin starts a child login session as another staff member. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('impersonate')
  async impersonate(@CurrentUser() user: AuthUser, @Body() dto: ImpersonateDto) {
    return this.authService.impersonate(user, dto);
  }

  /** Return from a child login session to the originating Super Admin. */
  @UseGuards(JwtAuthGuard)
  @Post('switch-back')
  async switchBack(@CurrentUser() user: AuthUser) {
    return this.authService.switchBack(user);
  }

  /** Get active device sessions for current user (maximum 3 devices). */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@CurrentUser() user: AuthUser, @Req() req: any) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    return this.authService.getUserSessions(user, token);
  }

  /** Revoke an active device session. */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@CurrentUser() user: AuthUser, @Param('id') sessionId: string) {
    return this.authService.revokeSession(user, sessionId);
  }

  /** Get login activity history for current user. */
  @UseGuards(JwtAuthGuard)
  @Get('activity')
  async getActivity(@CurrentUser() user: AuthUser) {
    return this.authService.getUserActivity(user);
  }

  /** Super Admin: Audit all organization logins with IP and location. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/activity')
  async getAdminActivity(@CurrentUser() user: AuthUser) {
    return this.authService.getAdminActivity(user);
  }
}

