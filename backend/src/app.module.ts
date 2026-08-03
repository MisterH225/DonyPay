import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SavingsEngineModule } from './modules/savings-engine/savings-engine.module';
import { PaymentLinksModule } from './modules/payment-links/payment-links.module';
import { LedgerAdapterModule } from './modules/ledger-adapter';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DisputesModule } from './modules/disputes/disputes.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
