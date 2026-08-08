import { SavingsGoalStatus } from '@prisma/client';
import { SavingsGoalsService } from '../../src/modules/savings-engine/savings-goals.service';
import {
  bootE2eApp,
  closeE2eApp,
  isolateE2e,
  ensureE2eDb,
  type E2eContext,
} from './helpers/bootstrap';
import { createFlexiGoalFixture } from './helpers/fixtures';

describe('E2E — Savings goal concurrency', () => {
  let ctx: E2eContext | null;
  let savingsGoals: SavingsGoalsService;

  beforeAll(async () => {
    ctx = await bootE2eApp();
    if (ctx) {
      savingsGoals = ctx.moduleRef.get(SavingsGoalsService);
    }
  });

  afterAll(async () => {
    await closeE2eApp(ctx);
  });

  beforeEach(async () => {
    if (!ctx) return;
    await isolateE2e(ctx);
  });

  it('deux dépôts concurrents (paiement délégué) → savedAmount exact + reached seulement à la cible', async () => {
    if (!ensureE2eDb(ctx)) return;

    const fixture = await createFlexiGoalFixture(ctx, { targetAmount: 100 });

    const results = await Promise.allSettled([
      savingsGoals.recordDeposit(fixture.goalId, { amount: 40 }),
      savingsGoals.recordDeposit(fixture.goalId, { amount: 60 }),
    ]);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

    const goal = await savingsGoals.findById(fixture.goalId);
    expect(Number(goal.savedAmount)).toBe(100);
    expect(goal.status).toBe(SavingsGoalStatus.ready_for_withdrawal);
    expect(goal.readyAt).toBeTruthy();

    const deposits = await ctx.prisma.savingsDeposit.count({
      where: { goalId: fixture.goalId },
    });
    expect(deposits).toBe(2);
  });

  it('deux dépôts concurrents sous la cible → status active, pas reached', async () => {
    if (!ensureE2eDb(ctx)) return;

    const fixture = await createFlexiGoalFixture(ctx, { targetAmount: 200 });

    await Promise.all([
      savingsGoals.recordDeposit(fixture.goalId, { amount: 50 }),
      savingsGoals.recordDeposit(fixture.goalId, { amount: 50 }),
    ]);

    const goal = await savingsGoals.findById(fixture.goalId);
    expect(Number(goal.savedAmount)).toBe(100);
    expect(goal.status).toBe(SavingsGoalStatus.active);
    expect(goal.readyAt).toBeNull();
  });
});
