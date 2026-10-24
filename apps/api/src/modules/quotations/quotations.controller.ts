import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  UseGuards,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('quotations')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @RequireFeature('quotation')
  async create(
    @Body() createQuotationDto: CreateQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotationsService.create(createQuotationDto, user);
  }

  @Get()
  @RequireFeature('quotation')
  async findAll(@CurrentUser() user: AuthUser) {
    return this.quotationsService.findAll(user);
  }

  @Get('lead/:leadId')
  @RequireFeature('quotation')
  async findByLead(
    @Param('leadId') leadId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotationsService.findByLead(leadId, user);
  }

  @Get(':id/pdf')
  @RequireFeature('quotation')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline; filename="solar_proposal.pdf"')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const buffer = await this.quotationsService.getPdfBuffer(id, user);
    res.end(buffer);
  }
}
