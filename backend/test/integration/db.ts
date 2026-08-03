import { PrismaClient } from '@prisma/client';

let shared: PrismaClient | null = null;

/**
 * Client Prisma partagé pour les tests d'intégration.
 * Retourne null si la DB est injoignable (les specs devront skip).
 */
export async function getIntegrationPrisma(): Promise<PrismaClient | null> {
  if (shared) {
    try {
      await shared.$queryRaw`SELECT 1`;
      return shared;
    } catch {
      await shared.$disconnect().catch(() => undefined);
      shared = null;
    }
  }

  const client = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

  try {
    await client.$connect();
    await client.$queryRaw`SELECT 1`;
    shared = client;
    return client;
  } catch {
    await client.$disconnect().catch(() => undefined);
    return null;
  }
}

export async function disconnectIntegrationPrisma(): Promise<void> {
  if (shared) {
    await shared.$disconnect().catch(() => undefined);
    shared = null;
  }
}

/**
 * Nettoyage agressif des tables métier (ordre FK-safe via CASCADE).
 */
export async function resetIntegrationDatabase(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "notifications",
      "payment_links",
      "savings_deposits",
      "savings_installments",
      "savings_goals",
      "ledger_entries",
      "ledger_accounts",
      "products",
      "shops",
      "kyc_documents",
      "two_factor_challenges",
      "users"
    RESTART IDENTITY CASCADE
  `);
}
