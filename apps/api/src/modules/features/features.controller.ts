import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('features')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  async getMatrix(@CurrentUser() user: AuthUser) {
    return this.featuresService.getMatrix(user);
  }

  /** Super Admin feature-permission matrix (roles x features + per-user overrides). */
  @Get('matrix')
  @Roles('super_admin')
  async getFullMatrix(@CurrentUser() user: AuthUser) {
    return this.featuresService.getMatrix(user);
  }

  @Get('grants')
  @Roles('super_admin')
  async getGrants(@CurrentUser() user: AuthUser) {
    return this.featuresService.getGrants(user);
  }

  @Put('grants')
  @Roles('super_admin')
  async updateGrant(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      scope: 'org' | 'role' | 'user';
      scope_value: string;
      feature_key: string;
      enabled: boolean;
    },
  ) {
    return this.featuresService.updateGrant(user, body);
  }

  @Post('grants/bulk')
  @Roles('super_admin')
  async bulkUpdateGrants(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      changes: Array<{
        scope: 'org' | 'role' | 'user';
        scope_value: string;
        feature_key: string;
        enabled: boolean;
      }>;
    },
  ) {
    return this.featuresService.bulkUpdateGrants(user, body);
  }
}
