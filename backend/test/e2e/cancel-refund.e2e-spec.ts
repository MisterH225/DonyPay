import { SavingsGoalStatus } from '@prisma/client';
import {
  LEDGER_PORT,
  type LedgerPort,
} from '../../src/modules/ledger-adapter';
import { SavingsGoalsService } from '../../src/modules/savings-engine/savings-goals.service';
import {
  bootE2eApp,
  closeE2eApp,
  isolateE2e,
  ensureE2eDb,
  type E2eContext,
} from './helpers/bootstrap';
import { createFlexiGoalFixture } from './helpers/fixtures';

describe('E2E — Cancel avec remboursement ledger', () => {
  let ctx: E2eContext | null;
  let savingsGoals: SavingsGoalsService;
  let ledger: LedgerPort;

  beforeAll(async () => {
    ctx = await bootE2eApp();
    if (ctx) {
      savingsGoals = ctx.moduleRef.get(SavingsGoalsService);
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

  it('annuler un goal avec savedAmount > 0 → solde ledger à 0', async () => {
    if (!ensureE2eDb(ctx)) return;

    const fixture = await createFlexiGoalFixture(ctx, {
      targetAmount: 100,
      savedViaDeposit: 75,
    });

    await expect(ledger.getBalance(fixture.ledgerAccountId)).resolves.toBe(75);

    const cancelled = await savingsGoals.cancel(
      fixture.goalId,
      fixture.buyer.userId,
    );

    expect(cancelled.status).toBe(SavingsGoalStatus.cancelled);
    await expect(ledger.getBalance(fixture.ledgerAccountId)).resolves.toBe(0);

    const refundNotif = await ctx.prisma.notification.findFirst({
      where: {
        userId: fixture.buyer.userId,
        type: 'refund_initiated',
      },
    });
    expect(refundNotif).toBeTruthy();
    expect(refundNotif?.body).toMatch(/75/);
  });
});
