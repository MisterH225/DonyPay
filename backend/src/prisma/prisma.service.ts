import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // Sur Railway, laisser plus de temps (healthcheck ~5 min) avant d’abandonner.
    const defaultRetries = process.env.RAILWAY_ENVIRONMENT ? 20 : 10;
    const maxAttempts = Number(
      process.env.PRISMA_CONNECT_RETRIES ?? defaultRetries,
    );
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log(`Prisma connected (attempt ${attempt}/${maxAttempts})`);
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Prisma connect failed (attempt ${attempt}/${maxAttempts}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }

    this.logger.error(
      'Prisma could not connect after all retries — Nest will not listen. Check DATABASE_URL (use ${{Postgres.DATABASE_URL}} on Railway).',
    );
    throw lastError;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
