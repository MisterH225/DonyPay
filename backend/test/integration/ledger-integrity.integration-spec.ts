import { Test, TestingModule } from '@nestjs/testing';
import { LedgerEntryType, Prisma } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { MockLedgerAdapter } from '../../src/modules/ledger-adapter/adapters/mock-ledger.adapter';
import { LEDGER_PORT, type LedgerPort } from '../../src/modules/ledger-adapter';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  disconnectIntegrationPrisma,
  getIntegrationPrisma,
  resetIntegrationDatabase,
} from './db';

/**
 * Intégrité ledger au niveau DB :
 * - UPDATE / DELETE interdits sur ledger_entries (triggers append-only)
 * - cohérence solde : somme signée des écritures = getBalance = dernier balance_after
 */
describe('Ledger integrity (integration)', () => {
  let prisma: PrismaService;
  let ledger: LedgerPort;
  let moduleRef: TestingModule;
  let dbAvailable = false;

  beforeAll(async () => {
    const raw = await getIntegrationPrisma();
    dbAvailable = Boolean(raw);
    if (!dbAvailable) {
      return;
    }

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    ledger = moduleRef.get<LedgerPort>(LEDGER_PORT);
    // Garantit l'adaptateur mock (compta sync) pour ces assertions.
    expect(moduleRef.get(MockLedgerAdapter)).toBeDefined();
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    await disconnectIntegrationPrisma();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await resetIntegrationDatabase(prisma);
  });

  it('refuse UPDATE et DELETE sur ledger_entries (trigger DB)', async () => {
    if (!dbAvailable) {
      if (process.env.REQUIRE_INTEGRATION_DB === '1') {
        throw new Error('DATABASE_URL injoignable (REQUIRE_INTEGRATION_DB=1)');
      }
      return console.warn('SKIP: DATABASE_URL injoignable');
    }

    const accountId = await ledger.openSavingsAccount('user-append-only');
    await ledger.recordDeposit(accountId, 100, { test: 'append-only' });

    const entry = await prisma.ledgerEntry.findFirst({
      where: { accountId, type: LedgerEntryType.credit },
    });
    expect(entry).toBeTruthy();

    await expect(
      prisma.ledgerEntry.update({
        where: { id: entry!.id },
        data: { amount: new Prisma.Decimal(1) },
      }),
    ).rejects.toThrow(/append-only/i);

    await expect(
      prisma.ledgerEntry.delete({ where: { id: entry!.id } }),
    ).rejects.toThrow(/append-only/i);

    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "ledger_entries" SET amount = 1 WHERE id = $1`,
        entry!.id,
      ),
    ).rejects.toThrow(/append-only/i);

    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM "ledger_entries" WHERE id = $1`,
        entry!.id,
      ),
    ).rejects.toThrow(/append-only/i);

    // L'écriture est toujours là, inchangée.
    const stillThere = await prisma.ledgerEntry.findUnique({
      where: { id: entry!.id },
    });
    expect(Number(stillThere!.amount)).toBe(100);
  });

  it('garantit somme des écritures = getBalance = dernier balance_after', async () => {
    if (!dbAvailable) {
      if (process.env.REQUIRE_INTEGRATION_DB === '1') {
        throw new Error('DATABASE_URL injoignable (REQUIRE_INTEGRATION_DB=1)');
      }
      return console.warn('SKIP: DATABASE_URL injoignable');
    }

    const accountId = await ledger.openSavingsAccount('user-balance');

    await ledger.recordDeposit(accountId, 100);
    await ledger.recordDeposit(accountId, 50.5);
    await ledger.recordWithdrawal(accountId, 20);
    await ledger.recordDeposit(accountId, 10);

    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    expect(entries.length).toBeGreaterThan(0);

    const signedSum = entries.reduce((acc, entry) => {
      const amount = Number(entry.amount.toString());
      return entry.type === LedgerEntryType.credit
        ? acc + amount
        : acc - amount;
    }, 0);

    const balance = await ledger.getBalance(accountId);
    const lastBalanceAfter = Number(
      entries[entries.length - 1].balanceAfter.toString(),
    );

    expect(signedSum).toBeCloseTo(140.5, 2);
    expect(balance).toBeCloseTo(140.5, 2);
    expect(balance).toBeCloseTo(lastBalanceAfter, 2);
    expect(signedSum).toBeCloseTo(balance, 2);
  });
});
