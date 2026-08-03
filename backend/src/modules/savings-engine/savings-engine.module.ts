import { Module } from '@nestjs/common';
import { LedgerAdapterModule } from '../ledger-adapter';
import { NotificationsModule } from '../notifications/notifications.module';
import { SavingsEngineController } from './savings-engine.controller';
import { SavingsEngineService } from './savings-engine.service';
import { SavingsGoalsService } from './savings-goals.service';

@Module({
  imports: [LedgerAdapterModule, NotificationsModule],
  controllers: [SavingsEngineController],
  providers: [SavingsEngineService, SavingsGoalsService],
  exports: [SavingsGoalsService],
})
export class SavingsEngineModule {}
