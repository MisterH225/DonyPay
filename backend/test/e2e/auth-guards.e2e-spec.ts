import request from 'supertest';
import {
  bootE2eApp,
  closeE2eApp,
  isolateE2e,
  ensureE2eDb,
  type E2eContext,
} from './helpers/bootstrap';
import { authHeader, createAuthenticatedUser } from './helpers/auth';
import { createFlexiGoalFixture } from './helpers/fixtures';

describe('E2E — Auth JWT (401 / 403)', () => {
  let ctx: E2eContext | null;

  beforeAll(async () => {
    ctx = await bootE2eApp();
  });

  afterAll(async () => {
    await closeE2eApp(ctx);
  });

  beforeEach(async () => {
    if (!ctx) return;
    await isolateE2e(ctx);
  });

  it('endpoint protégé sans JWT → 401', async () => {
    if (!ensureE2eDb(ctx)) return;

    await request(ctx.app.getHttpServer())
      .get('/api/identity/me')
      .expect(401);

    await request(ctx.app.getHttpServer())
      .post('/api/savings-engine/goals')
      .send({})
      .expect(401);
  });

  it('JWT d’un autre utilisateur sur cancel → 403', async () => {
    if (!ensureE2eDb(ctx)) return;

    const fixture = await createFlexiGoalFixture(ctx, {
      targetAmount: 100,
      savedViaDeposit: 20,
    });
    const intruder = await createAuthenticatedUser(ctx.app, {
      firstName: 'Intruder',
    });

    await request(ctx.app.getHttpServer())
      .post(`/api/savings-engine/goals/${fixture.goalId}/cancel`)
      .set(authHeader(intruder.accessToken))
      .expect(403);

    const goal = await ctx.prisma.savingsGoal.findUnique({
      where: { id: fixture.goalId },
    });
    expect(goal?.status).toBe('active');
  });

  it('JWT d’un non-vendeur sur confirm-handover → 403', async () => {
    if (!ensureE2eDb(ctx)) return;

    const fixture = await createFlexiGoalFixture(ctx, {
      targetAmount: 50,
      savedViaDeposit: 50,
    });

    await request(ctx.app.getHttpServer())
      .post(`/api/savings-engine/goals/${fixture.goalId}/confirm-handover`)
      .set(authHeader(fixture.buyer.accessToken))
      .expect(403);
  });
});
