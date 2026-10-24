import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { UpsertSurveyDto } from './dto/survey.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('surveys')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  @RequireFeature('survey')
  async createOrUpdateSurvey(
    @CurrentUser() user: AuthUser,
    @Body() body: UpsertSurveyDto,
  ) {
    return this.surveysService.createOrUpdateSurvey(user, body);
  }

  @Get('lead/:leadId')
  @RequireFeature('survey')
  async getSurveyByLead(
    @Param('leadId') leadId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.surveysService.getSurveyByLead(leadId, user);
  }
}
