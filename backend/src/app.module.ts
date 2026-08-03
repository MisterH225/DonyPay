import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SavingsEngineModule } from './modules/savings-engine/savings-engine.module';
import { PaymentLinksModule } from './modules/payment-links/payment-links.module';
import { LedgerAdapterModule } from './modules/ledger-adapter/ledger-adapter.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IdentityModule,
    CatalogModule,
    SavingsEngineModule,
    PaymentLinksModule,
    LedgerAdapterModule,
    NotificationsModule,
    DisputesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
