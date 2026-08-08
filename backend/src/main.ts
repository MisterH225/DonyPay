import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT=${process.env.PORT}`);
  }

  logger.log(
    `Bootstrapping Nest (HOST=${host} PORT=${port} RAILWAY=${process.env.RAILWAY_ENVIRONMENT ?? 'no'})`,
  );

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Railway / containers : écouter sur toutes les interfaces (pas seulement localhost).
  await app.listen(port, host);
  logger.log(`Listening on http://${host}:${port}/api`);
  logger.log(`Healthcheck URL: http://${host}:${port}/api/health`);
}
bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    `Fatal bootstrap error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
