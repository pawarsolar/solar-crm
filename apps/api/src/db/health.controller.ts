import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SupabaseService, SchemaHealthReport } from './supabase.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Health ping endpoint for container orchestrators and monitoring.
   */
  @Get()
  ping() {
    return {
      status: 'ok',
      service: 'Kyros Solar EPC CRM API',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns current schema synchronization and table accessibility status.
   */
  @Get('schema')
  getSchemaHealth(): SchemaHealthReport {
    return this.supabaseService.getSchemaHealth();
  }

  /**
   * Forces an immediate ping to Supabase PostgREST tables to verify if recent migrations have resolved schema cache.
   */
  @Post('schema/sync-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'sales_admin')
  async recheckSchema(): Promise<SchemaHealthReport> {
    return this.supabaseService.checkSchemaHealth();
  }
}
