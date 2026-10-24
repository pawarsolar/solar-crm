import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('super_admin', 'sales_admin')
  async findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAll(user);
  }

  @Get('me')
  async getMyProfile(@CurrentUser() user: AuthUser) {
    return this.usersService.getMyProfile(user);
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: { full_name?: string; phone?: string; avatar_url?: string; password?: string },
  ) {
    return this.usersService.updateMyProfile(user, body);
  }

  @Get(':id')
  @Roles('super_admin', 'sales_admin')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.findOne(user, id);
  }

  @Post()
  @Roles('super_admin')
  async createUser(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.createUser(user, dto);
  }

  @Patch(':id/role')
  @Roles('super_admin')
  async updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.usersService.updateRole(user, id, role);
  }

  @Patch(':id/status')
  @Roles('super_admin')
  async toggleStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
  ) {
    return this.usersService.toggleStatus(user, id, isActive);
  }

  @Patch(':id')
  @Roles('super_admin')
  async updateUser(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { full_name?: string; phone?: string; role?: string; team_id?: string },
  ) {
    return this.usersService.updateUser(user, id, body);
  }

  @Post(':id/reset-password')
  @Roles('super_admin')
  async resetPassword(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('password') password?: string,
  ) {
    return this.usersService.resetPassword(user, id, password);
  }

  @Delete(':id')
  @Roles('super_admin')
  async deleteUser(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteUser(user, id);
  }
}
