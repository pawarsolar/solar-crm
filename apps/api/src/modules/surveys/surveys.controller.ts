import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SurveysService } from './surveys.service';
import { UpsertSurveyDto } from './dto/survey.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

interface UploadedMulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
  size?: number;
}

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

  @Post('photos')
  @RequireFeature('survey')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadPhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedMulterFile,
    @Body() body: { leadId: string; surveyId?: string; photoType?: string; caption?: string },
  ) {
    if (!file) {
      throw new BadRequestException('A valid photo file is required');
    }
    if (!body?.leadId) {
      throw new BadRequestException('leadId is required to attach survey photos');
    }
    return this.surveysService.uploadSurveyPhoto(user, file, body);
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
