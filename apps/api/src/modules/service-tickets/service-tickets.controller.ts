import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ServiceTicketsService } from './service-tickets.service';
import { CreateServiceTicketDto, UpdateServiceTicketDto } from './dto/service-ticket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('service-tickets')
@UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
export class ServiceTicketsController {
  constructor(private readonly serviceTicketsService: ServiceTicketsService) {}

  @Post()
  @RequireFeature('service_tickets')
  @Roles('super_admin', 'sales_admin', 'sales_exec', 'telecaller', 'installer')
  async create(@Body() body: CreateServiceTicketDto, @CurrentUser() user: AuthUser) {
    return this.serviceTicketsService.create(body, user);
  }

  @Get()
  @RequireFeature('service_tickets')
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.serviceTicketsService.findAll(user, { status, priority });
  }

  @Patch(':id')
  @RequireFeature('service_tickets')
  @Roles('super_admin', 'sales_admin', 'installer')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateServiceTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.serviceTicketsService.update(id, body, user);
  }
}
