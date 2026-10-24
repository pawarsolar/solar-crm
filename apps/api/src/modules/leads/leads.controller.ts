import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AssignLeadsDto } from './dto/assign-leads.dto';
import { BulkAllocateDto } from './dto/bulk-allocate-leads.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('leads')
@UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequireFeature('leads')
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('stage') stage?: string,
    @Query('owner_id') owner_id?: string,
    @Query('city') city?: string,
    @Query('source') source?: string,
    @Query('q') q?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('pageSize') pageSize?: number,
    @Query('unassigned_only') unassigned_only?: boolean | string,
    @Query('date_preset') date_preset?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
  ) {
    return this.leadsService.findAll(user, {
      stage,
      owner_id,
      city,
      source,
      q,
      cursor,
      page,
      limit,
      pageSize,
      unassigned_only,
      date_preset,
      date_from,
      date_to,
    });
  }

  @Get('staff-workload')
  @RequireFeature('leads')
  @Roles('super_admin', 'sales_admin')
  async getStaffWorkload(@CurrentUser() user: AuthUser) {
    return this.leadsService.getStaffWorkload(user);
  }

  @Post('allocate/preview')
  @RequireFeature('leads')
  @Roles('super_admin', 'sales_admin')
  async previewAllocation(
    @Body() dto: BulkAllocateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leadsService.previewAllocation(dto, user);
  }

  @Post('allocate')
  @RequireFeature('leads')
  @Roles('super_admin', 'sales_admin')
  async bulkAllocate(
    @Body() dto: BulkAllocateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leadsService.bulkAllocate(dto, user);
  }

  @Get('allocate/history')
  @RequireFeature('leads')
  @Roles('super_admin', 'sales_admin')
  async getAllocationHistory(@CurrentUser() user: AuthUser) {
    return this.leadsService.getAllocationHistory(user);
  }

  @Post('assign')
  @RequireFeature('leads')
  @Roles('super_admin', 'sales_admin')
  async assign(@Body() assignLeadsDto: AssignLeadsDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.assign(assignLeadsDto, user);
  }

  @Get(':id')
  @RequireFeature('leads')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leadsService.findOne(id, user);
  }

  @Post()
  @RequireFeature('leads')
  async create(@Body() createLeadDto: CreateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.create(createLeadDto, user);
  }

  @Patch(':id/stage')
  @RequireFeature('leads')
  async updateStage(
    @Param('id') id: string,
    @Body() updateStageDto: UpdateStageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leadsService.updateStage(id, updateStageDto, user);
  }

  @Delete('purge-seed')
  @RequireFeature('leads')
  @Roles('super_admin')
  async purgeSeedData(@CurrentUser() user: AuthUser) {
    return this.leadsService.purgeSeedData(user);
  }

  @Get('recovery/bin')
  @RequireFeature('leads')
  @Roles('super_admin')
  async getRecoveryBin(@CurrentUser() user: AuthUser) {
    return this.leadsService.getRecoveryBin(user);
  }

  @Post(':id/restore')
  @RequireFeature('leads')
  @Roles('super_admin')
  async restoreLead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leadsService.restoreLead(id, user);
  }

  @Delete(':id/permanent')
  @RequireFeature('leads')
  @Roles('super_admin')
  async permanentlyDelete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leadsService.permanentlyDelete(id, user);
  }

  @Post(':id/followup')
  @RequireFeature('leads')
  @Roles('super_admin', 'sales_admin', 'telecaller', 'sales_exec')
  async logFollowup(
    @Param('id') id: string,
    @Body() body: { outcome: string; note?: string; next_followup_at?: string; stage?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.leadsService.logFollowup(id, body, user);
  }

  @Post(':id/request-delete')
  @RequireFeature('leads')
  @Roles('super_admin', 'sales_admin', 'telecaller', 'sales_exec')
  async requestDelete(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leadsService.requestDelete(id, reason || 'Lead duplicate or invalid', user);
  }

  @Delete(':id')
  @RequireFeature('leads')
  @Roles('super_admin')
  async softDelete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leadsService.softDelete(id, user);
  }

  @Post(':id/approve-delete')
  @RequireFeature('leads')
  @Roles('super_admin')
  async approveDelete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leadsService.approveDelete(id, user);
  }
}
