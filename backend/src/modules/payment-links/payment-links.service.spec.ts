import { Test, TestingModule } from '@nestjs/testing';
import { PaymentLinksService } from './payment-links.service';

describe('PaymentLinksService', () => {
  let service: PaymentLinksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentLinksService],
    }).compile();

    service = module.get<PaymentLinksService>(PaymentLinksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return hello-world payload', () => {
    expect(service.getHello()).toEqual({
      module: 'payment-links',
      message: 'Hello from payment-links module',
    });
  });
});
