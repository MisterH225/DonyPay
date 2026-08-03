import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogService],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return hello-world payload', () => {
    expect(service.getHello()).toEqual({
      module: 'catalog',
      message: 'Hello from catalog module',
    });
  });
});
