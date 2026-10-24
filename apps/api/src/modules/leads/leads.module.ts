import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { FeatureGuard } from '../../common/guards/feature.guard';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, FeatureGuard],
  exports: [LeadsService],
})
export class LeadsModule {}
