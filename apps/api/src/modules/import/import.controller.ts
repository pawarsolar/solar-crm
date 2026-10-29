import {
  Controller,
  Post,
  Get,
  Res,
  Header,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

interface UploadedMulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
  size?: number;
}

@Controller('leads/import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('preview')
  @UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
  @RequireFeature('bulk_import')
  @Roles('super_admin', 'sales_admin')
  @UseInterceptors(
    FileInterceptor('file', {
      // Hard cap to keep the whole workbook out of a runaway memory spike.
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async preview(@UploadedFile() file: UploadedMulterFile) {
    if (!file) {
      throw new BadRequestException('A spreadsheet file (.xlsx or .csv) is required');
    }

    const name = (file.originalname || '').toLowerCase();
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    if (!allowedExtensions.some((ext) => name.endsWith(ext))) {
      throw new BadRequestException('Only .xlsx, .xls or .csv files are accepted');
    }

    const isCsv = name.endsWith('.csv');
    return this.importService.previewStream(file.buffer, isCsv);
  }

  @Post('commit')
  @UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
  @RequireFeature('bulk_import')
  @Roles('super_admin', 'sales_admin')
  async commit(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.importService.commitImport(user, body);
  }

  @Get('sample-xlsx')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="solar_leads_sample.xlsx"')
  async downloadSampleXlsx(@Res() res: any) {
    const buffer = await this.importService.generateSampleExcel();
    res.end(buffer);
  }

  @Get('sample-csv')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="solar_leads_sample.csv"')
  async downloadSampleCsv(@Res() res: any) {
    const csv = this.importService.generateSampleCsv();
    res.end(csv);
  }
}
