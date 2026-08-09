import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import {
  disconnectE2ePrisma,
  getE2ePrisma,
  resetE2eDatabase,
} from './db';

export type E2eContext = {
  app: INestApplication;
  moduleRef: TestingModule;
  prisma: PrismaService;
};

/**
 * Démarre l'app Nest complète (prefix + ValidationPipe) contre Postgres.
 * Retourne null si DATABASE_URL est injoignable.
 */
export async function bootE2eApp(): Promise<E2eContext | null> {
  const raw = await getE2ePrisma();
  if (!raw) {
    return null;
  }

  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || 'e2e-access-secret';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'e2e-refresh-secret';
  process.env.CINETPAY_SANDBOX = process.env.CINETPAY_SANDBOX || 'true';
  process.env.CINETPAY_SECRET_KEY =
    process.env.CINETPAY_SECRET_KEY || 'cinetpay_sandbox_secret';
  process.env.CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID || 'sandbox_site';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const prisma = moduleRef.get(PrismaService);
  return { app, moduleRef, prisma };
}

export async function closeE2eApp(ctx: E2eContext | null): Promise<void> {
  if (ctx?.moduleRef) {
    await ctx.moduleRef.close();
  }
  await disconnectE2ePrisma();
}

export async function isolateE2e(ctx: E2eContext): Promise<void> {
  await resetE2eDatabase(ctx.prisma);
}

/**
 * Garde d'entrée des specs e2e DB.
 * - DB absente + REQUIRE_* → fail
 * - DB absente sinon → skip soft (retourne false)
 */
export function ensureE2eDb(ctx: E2eContext | null): ctx is E2eContext {
  if (ctx) return true;
  if (
    process.env.REQUIRE_E2E_DB === '1' ||
    process.env.REQUIRE_INTEGRATION_DB === '1'
  ) {
    throw new Error(
      'DATABASE_URL injoignable (REQUIRE_E2E_DB / REQUIRE_INTEGRATION_DB)',
    );
  }
  console.warn('SKIP: DATABASE_URL injoignable — e2e DB-backed');
  return false;
}
