import { Module } from '@nestjs/common';
import { LedgerAdapterModule } from '../ledger-adapter';
import { NotificationsModule } from '../notifications';
import { SavingsEngineModule } from '../savings-engine';
import { PaymentLinksController } from './payment-links.controller';
import { PaymentLinksService } from './payment-links.service';
import { PAYMENT_LINKS_SERVICE } from './payment-links.tokens';

@Module({
  imports: [SavingsEngineModule, NotificationsModule, LedgerAdapterModule],
  controllers: [PaymentLinksController],
  providers: [
    PaymentLinksService,
    { provide: PAYMENT_LINKS_SERVICE, useExisting: PaymentLinksService },
  ],
  exports: [PaymentLinksService, PAYMENT_LINKS_SERVICE],
})
export class PaymentLinksModule {}
