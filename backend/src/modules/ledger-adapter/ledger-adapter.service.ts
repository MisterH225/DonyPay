import { Injectable } from '@nestjs/common';

@Injectable()
export class LedgerAdapterService {
  getHello(): { module: string; message: string } {
    return {
      module: 'ledger-adapter',
      message: 'Hello from ledger-adapter module',
    };
  }
}
