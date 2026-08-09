import { BadRequestException } from '@nestjs/common';
import {
  LEDGER_PORT,
  type LedgerPort,
} from '../../src/modules/ledger-adapter';
import {
  bootE2eApp,
  closeE2eApp,
  isolateE2e,
  ensureE2eDb,
  type E2eContext,
} from './helpers/bootstrap';

describe('E2E — Ledger concurrency', () => {
  let ctx: E2eContext | null;
  let ledger: LedgerPort;

  beforeAll(async () => {
    ctx = await bootE2eApp();
    if (ctx) {
      ledger = ctx.moduleRef.get<LedgerPort>(LEDGER_PORT);
    }
  });

  afterAll(async () => {
    await closeE2eApp(ctx);
  });

  beforeEach(async () => {
    if (!ctx) return;
    await isolateE2e(ctx);
  });

  it('deux dépôts concurrents → solde = somme exacte (pas de lost update)', async () => {
    if (!ensureE2eDb(ctx)) return;

    const accountId = await ledger.openSavingsAccount('user-concurrent-deposit');

    const results = await Promise.allSettled([
      ledger.recordDeposit(accountId, 40, { source: 'e2e-a' }),
      ledger.recordDeposit(accountId, 60, { source: 'e2e-b' }),
    ]);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    await expect(ledger.getBalance(accountId)).resolves.toBe(100);

    const entries = await ctx.prisma.ledgerEntry.findMany({
      where: { accountId },
      orderBy: { sequence: 'asc' },
    });
    expect(entries).toHaveLength(2);
    expect(Number(entries[1].balanceAfter)).toBe(100);
  });

  it('deux retraits concurrents > solde → un seul réussit, jamais de solde négatif', async () => {
    if (!ensureE2eDb(ctx)) return;

    const accountId = await ledger.openSavingsAccount('user-concurrent-withdraw');
    await ledger.recordDeposit(accountId, 100, { source: 'seed' });

    const results = await Promise.allSettled([
      ledger.recordWithdrawal(accountId, 70),
      ledger.recordWithdrawal(accountId, 70),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason as Error;
    expect(reason).toBeInstanceOf(BadRequestException);
    expect(reason.message).toMatch(/Insufficient balance/i);

    const balance = await ledger.getBalance(accountId);
    expect(balance).toBe(30);
    expect(balance).toBeGreaterThanOrEqual(0);
  });
});
