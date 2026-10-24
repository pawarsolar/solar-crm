import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports/summary')
  @UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
  @RequireFeature('reports')
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getSummary(user, { from, to });
  }

  @Post('reports/share')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequireFeature('report_share')
  async createShareLink(
    @CurrentUser() user: AuthUser,
    @Body() body: { report: string; expiresInDays?: number },
  ) {
    return this.reportsService.createShareLink(user, body);
  }

  @Get('public/reports/:token')
  async getPublicReport(@Param('token') token: string) {
    return this.reportsService.getPublicReport(token);
  }
}
