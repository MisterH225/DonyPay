import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { LedgerAdapterService } from './ledger-adapter.service';

@Controller('ledger-adapter')
export class LedgerAdapterController {
  constructor(private readonly ledgerAdapterService: LedgerAdapterService) {}

  @Public()
  @Get('hello')
  getHello() {
    return this.ledgerAdapterService.getHello();
  }
}
