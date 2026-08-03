import { Module } from '@nestjs/common';
import { MockLedgerAdapter } from './adapters/mock-ledger.adapter';
import { LedgerAdapterController } from './ledger-adapter.controller';
import { LedgerAdapterService } from './ledger-adapter.service';
import { LEDGER_PORT } from './ports/ledger.port';

/**
 * Exporte uniquement LEDGER_PORT (contrat).
 * MockLedgerAdapter reste privé au module — aucun consommateur
 * ne doit dépendre de l'implémentation concrète.
 */
@Module({
  controllers: [LedgerAdapterController],
  providers: [
    MockLedgerAdapter,
    {
      provide: LEDGER_PORT,
      useExisting: MockLedgerAdapter,
    },
    LedgerAdapterService,
  ],
  exports: [LEDGER_PORT],
})
export class LedgerAdapterModule {}
