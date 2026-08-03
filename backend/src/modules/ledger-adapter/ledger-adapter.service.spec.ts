import { Test, TestingModule } from '@nestjs/testing';
import { LedgerAdapterService } from './ledger-adapter.service';

describe('LedgerAdapterService', () => {
  let service: LedgerAdapterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LedgerAdapterService],
    }).compile();

    service = module.get<LedgerAdapterService>(LedgerAdapterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return hello-world payload', () => {
    expect(service.getHello()).toEqual({
      module: 'ledger-adapter',
      message: 'Hello from ledger-adapter module',
    });
  });
});
