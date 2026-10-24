import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { SendWhatsappDto, WHATSAPP_TEMPLATES } from './dto/send-whatsapp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /** The available message templates, so the UI does not hardcode them. */
  @Get('templates')
  @RequireFeature('whatsapp')
  getTemplates() {
    return { templates: WHATSAPP_TEMPLATES };
  }

  @Post('link')
  @RequireFeature('whatsapp')
  // `accounts` is included because the role grant matrix gives them whatsapp for
  // payment reminders; the feature flag alone is not enough to authorise a route.
  @Roles('super_admin', 'sales_admin', 'telecaller', 'sales_exec', 'accounts')
  async buildLink(@Body() body: SendWhatsappDto, @CurrentUser() user: AuthUser) {
    return this.whatsappService.buildLink(body, user);
  }
}
