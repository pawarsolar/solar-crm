import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ComponentsService } from './components.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateComponentDto } from './dto/create-component.dto';

@Controller('components')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Get('search')
  async search(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('wattage_min') wattage_min?: string,
    @Query('wattage_max') wattage_max?: string,
    @Query('limit') limit?: string,
    @Query('include_inactive') include_inactive?: string,
  ) {
    return this.componentsService.search(user, {
      q,
      category,
      brand,
      wattage_min: wattage_min ? Number(wattage_min) : undefined,
      wattage_max: wattage_max ? Number(wattage_max) : undefined,
      limit: limit ? Number(limit) : undefined,
      include_inactive: include_inactive === 'true',
    });
  }

  @Get('brands')
  async getBrands(@CurrentUser() user: AuthUser, @Query('category') category?: string) {
    return this.componentsService.getBrands(user, category);
  }

  @Get('category/:category')
  async listByCategory(@CurrentUser() user: AuthUser, @Param('category') category: string) {
    return this.componentsService.listByCategory(user, category);
  }

  @Post()
  @Roles('super_admin', 'sales_admin')
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateComponentDto) {
    return this.componentsService.create(body, user);
  }

  @Post('bulk')
  @Roles('super_admin', 'sales_admin')
  async upsertMany(@CurrentUser() user: AuthUser, @Body() body: { components: CreateComponentDto[] }) {
    return this.componentsService.upsertMany(body.components || [], user);
  }

  @Delete(':id')
  @Roles('super_admin', 'sales_admin')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.componentsService.remove(id, user);
  }
}
