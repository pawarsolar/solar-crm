import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { InstallationsService } from './installations.service';
import {
  UpsertInstallationDto,
  UpdateInstallationStatusDto,
} from './dto/upsert-installation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('installations')
@UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
export class InstallationsController {
  constructor(private readonly installationsService: InstallationsService) {}

  @Post()
  @RequireFeature('installation')
  @Roles('super_admin', 'sales_admin', 'installer')
  async upsert(@Body() body: UpsertInstallationDto, @CurrentUser() user: AuthUser) {
    return this.installationsService.upsert(body, user);
  }

  @Patch(':id/status')
  @RequireFeature('installation')
  @Roles('super_admin', 'sales_admin', 'installer')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateInstallationStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.installationsService.updateStatus(id, body, user);
  }

  @Get('lead/:leadId')
  @RequireFeature('installation')
  async findByLead(@Param('leadId') leadId: string, @CurrentUser() user: AuthUser) {
    return this.installationsService.findByLead(leadId, user);
  }
}
