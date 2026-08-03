import { Test, TestingModule } from '@nestjs/testing';
import { SavingsEngineService } from './savings-engine.service';

describe('SavingsEngineService', () => {
  let service: SavingsEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SavingsEngineService],
    }).compile();

    service = module.get<SavingsEngineService>(SavingsEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return hello-world payload', () => {
    expect(service.getHello()).toEqual({
      module: 'savings-engine',
      message: 'Hello from savings-engine module',
    });
  });
});
