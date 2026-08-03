import { Inject, Injectable } from '@nestjs/common';
import { LEDGER_PORT, type LedgerPort } from './ports/ledger.port';

@Injectable()
export class LedgerAdapterService {
  constructor(
    @Inject(LEDGER_PORT)
    private readonly ledger: LedgerPort,
  ) {}

  getHello(): { module: string; message: string; port: string } {
    return {
      module: 'ledger-adapter',
      message: 'Hello from ledger-adapter module',
      port: 'LedgerPort',
    };
  }

  /** Expose le port pour les usages internes au module (ex. controller). */
  getLedger(): LedgerPort {
    return this.ledger;
  }
}
