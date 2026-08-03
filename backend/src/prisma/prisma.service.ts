import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    const maxAttempts = Number(process.env.PRISMA_CONNECT_RETRIES ?? 10);
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

    throw lastError;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
