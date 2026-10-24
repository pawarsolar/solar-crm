import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
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
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
}
