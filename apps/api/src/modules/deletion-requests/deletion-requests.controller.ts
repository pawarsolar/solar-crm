import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { DeletionRequestsService } from './deletion-requests.service';
import {
  CreateDeletionRequestDto,
  DecideDeletionRequestDto,
} from './dto/create-deletion-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('deletion-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeletionRequestsController {
  constructor(private readonly deletionRequestsService: DeletionRequestsService) {}

  @Post()
  // Same sales-side restriction as `POST /leads/:id/request-delete`.
  @Roles('super_admin', 'sales_admin', 'telecaller', 'sales_exec')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateDeletionRequestDto,
  ) {
    return this.deletionRequestsService.create(user, body);
  }

  @Get()
  @Roles('super_admin', 'sales_admin')
  async findAll(@CurrentUser() user: AuthUser) {
    return this.deletionRequestsService.findAll(user);
  }

  @Post(':id/decide')
  @Roles('super_admin', 'sales_admin')
  async decide(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: DecideDeletionRequestDto,
  ) {
    // `approved` remains the canonical field; `decision` is accepted for the
    // AdminPage client which posts { approved: boolean }.
    const approved =
      typeof (body as any).approved === 'boolean'
        ? (body as any).approved
        : body.decision === 'approve';
    return this.deletionRequestsService.decide(id, user, approved, body.note);
  }
}
