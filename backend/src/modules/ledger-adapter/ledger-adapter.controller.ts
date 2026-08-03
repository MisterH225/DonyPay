import { Controller, Get } from '@nestjs/common';
import { LedgerAdapterService } from './ledger-adapter.service';

@Controller('ledger-adapter')
export class LedgerAdapterController {
  constructor(private readonly ledgerAdapterService: LedgerAdapterService) {}

  @Get('hello')
  getHello() {
    return this.ledgerAdapterService.getHello();
  }
}
