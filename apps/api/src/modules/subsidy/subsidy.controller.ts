import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { SubsidyService } from './subsidy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';

@Controller('subsidy')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class SubsidyController {
  constructor(private readonly subsidyService: SubsidyService) {}

  @Get('config')
  @RequireFeature('subsidy')
  async getConfig() {
    return this.subsidyService.getConfig();
  }

  @Get('calculate')
  @RequireFeature('subsidy')
  async calculate(@Query('capacity_kw') capacityKw?: string) {
    const kw = Number(capacityKw);
    if (!capacityKw || Number.isNaN(kw) || kw < 0) {
      throw new BadRequestException('capacity_kw must be a positive number');
    }
    return this.subsidyService.calculate(kw);
  }
}
