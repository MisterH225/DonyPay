import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications';
import { SavingsEngineModule } from '../savings-engine';
import { PaymentLinksController } from './payment-links.controller';
import { PaymentLinksService } from './payment-links.service';

@Module({
  imports: [SavingsEngineModule, NotificationsModule],
  controllers: [PaymentLinksController],
  providers: [PaymentLinksService],
  exports: [PaymentLinksService],
})
export class PaymentLinksModule {}
