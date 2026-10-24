import { Module } from '@nestjs/common';
import { ServiceTicketsController } from './service-tickets.controller';
import { ServiceTicketsService } from './service-tickets.service';

@Module({
  controllers: [ServiceTicketsController],
  providers: [ServiceTicketsService],
  exports: [ServiceTicketsService],
})
export class ServiceTicketsModule {}
