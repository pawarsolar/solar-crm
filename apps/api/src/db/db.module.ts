import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { HealthController } from './health.controller';

/**
 * Global database module. SupabaseService is expensive to construct (creates an
 * HTTP client and a Postgres pool), so it must be a single shared singleton rather
 * than being re-provided by every feature module.
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class DbModule {}
