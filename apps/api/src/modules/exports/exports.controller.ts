import { Controller, Get, Res, UseGuards, Header } from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('exports')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('pipeline.xlsx')
  @RequireFeature('export_excel')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="solar_pipeline.xlsx"')
  async exportExcel(@CurrentUser() user: AuthUser, @Res() res: Response) {
    return this.exportsService.streamPipelineExcel(res, user);
  }

  @Get('pipeline.pdf')
  @RequireFeature('export_pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="solar_pipeline_summary.pdf"')
  async exportPdf(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const buffer = await this.exportsService.getPipelinePdfBuffer(user);
    res.end(buffer);
  }
}
