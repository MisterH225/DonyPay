import { Module } from '@nestjs/common';
import { SavingsEngineModule } from '../savings-engine';
import { PaymentLinksController } from './payment-links.controller';
import { PaymentLinksService } from './payment-links.service';

@Module({
  imports: [SavingsEngineModule],
  controllers: [PaymentLinksController],
  providers: [PaymentLinksService],
  exports: [PaymentLinksService],
})
export class PaymentLinksModule {}
