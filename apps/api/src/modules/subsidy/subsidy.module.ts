import { Module } from '@nestjs/common';
import { SubsidyController } from './subsidy.controller';
import { SubsidyService } from './subsidy.service';

@Module({
  controllers: [SubsidyController],
  providers: [SubsidyService],
  exports: [SubsidyService],
})
export class SubsidyModule {}
