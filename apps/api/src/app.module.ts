import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DbModule } from './db/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ImportModule } from './modules/import/import.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { DeletionRequestsModule } from './modules/deletion-requests/deletion-requests.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExportsModule } from './modules/exports/exports.module';
import { FeaturesModule } from './modules/features/features.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';
import { InstallationsModule } from './modules/installations/installations.module';
import { ServiceTicketsModule } from './modules/service-tickets/service-tickets.module';
import { SubsidyModule } from './modules/subsidy/subsidy.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ComponentsModule } from './modules/components/components.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // 100 requests per minute per client
      },
    ]),
    DbModule,
    AuthModule,
    LeadsModule,
    ImportModule,
    QuotationsModule,
    PaymentsModule,
    SurveysModule,
    DeletionRequestsModule,
    DashboardModule,
    ExportsModule,
    FeaturesModule,
    ReportsModule,
    UsersModule,
    InstallationsModule,
    ServiceTicketsModule,
    SubsidyModule,
    WhatsappModule,
    ComponentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
