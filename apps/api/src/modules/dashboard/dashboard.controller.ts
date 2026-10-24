import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequireFeature('kpi_dashboard')
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Query('view') view?: 'company' | 'my',
  ) {
    return this.dashboardService.getSummary(user, view);
  }

  @Get('team')
  @RequireFeature('kpi_dashboard')
  async getTeamPerformance(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getTeamPerformance(user);
  }
}
