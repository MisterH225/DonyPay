import { Test, TestingModule } from '@nestjs/testing';
import { IdentityService } from './identity.service';

describe('IdentityService', () => {
  let service: IdentityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdentityService],
    }).compile();

    service = module.get<IdentityService>(IdentityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return hello-world payload', () => {
    expect(service.getHello()).toEqual({
      module: 'identity',
      message: 'Hello from identity module',
    });
  });
});
