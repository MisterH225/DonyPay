import { Test, TestingModule } from '@nestjs/testing';
import { LedgerAdapterService } from './ledger-adapter.service';
import { LEDGER_PORT, type LedgerPort } from './ports/ledger.port';

describe('LedgerAdapterService', () => {
  let service: LedgerAdapterService;
  const ledgerPort: LedgerPort = {
    openSavingsAccount: jest.fn(),
    recordDeposit: jest.fn(),
    getBalance: jest.fn(),
    recordWithdrawal: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerAdapterService,
        { provide: LEDGER_PORT, useValue: ledgerPort },
      ],
    }).compile();

    service = module.get<LedgerAdapterService>(LedgerAdapterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return hello-world payload bound to LedgerPort', () => {
    expect(service.getHello()).toEqual({
      module: 'ledger-adapter',
      message: 'Hello from ledger-adapter module',
      port: 'LedgerPort',
    });
  });

  it('exposes the injected port, not a concrete adapter', () => {
    expect(service.getLedger()).toBe(ledgerPort);
  });
});
