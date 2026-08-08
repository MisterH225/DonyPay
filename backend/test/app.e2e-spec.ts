import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        // AdminService.onModuleInit → ensureSystemAdmin (ADMIN_API_KEY en CI)
        user: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'admin-1',
            email: 'admin@donypay.internal',
            role: 'admin',
          }),
          create: jest.fn(),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer()).get('/api').expect(200).expect({
      app: 'donypay-backend',
      message: 'Hello from DonyPay API',
    });
  });

  it('/api/identity/hello (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/identity/hello')
      .expect(200)
      .expect({
        module: 'identity',
        message: 'Hello from identity module',
      });
  });
});
