import { Module } from '@nestjs/common';
import { LedgerAdapterController } from './ledger-adapter.controller';
import { LedgerAdapterService } from './ledger-adapter.service';

@Module({
  controllers: [LedgerAdapterController],
  providers: [LedgerAdapterService],
  exports: [LedgerAdapterService],
})
export class LedgerAdapterModule {}
