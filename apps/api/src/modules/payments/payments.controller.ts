import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequireFeature('payments')
  async recordPayment(
    @Body() recordPaymentDto: RecordPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.recordPayment(recordPaymentDto, user);
  }

  @Get('lead/:leadId')
  @RequireFeature('payments')
  async getPaymentsByLead(
    @Param('leadId') leadId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.getPaymentsByLead(leadId, user);
  }
}
