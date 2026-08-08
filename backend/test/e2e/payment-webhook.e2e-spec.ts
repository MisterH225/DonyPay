import { MobileMoneyCollectionStatus } from '@prisma/client';
import request from 'supertest';
import {
  LEDGER_PORT,
  MobileMoneyAdapter,
  type LedgerPort,
} from '../../src/modules/ledger-adapter';
import { PaymentLinksService } from '../../src/modules/payment-links/payment-links.service';
import {
  bootE2eApp,
  closeE2eApp,
  isolateE2e,
  ensureE2eDb,
  type E2eContext,
} from './helpers/bootstrap';
import { buildSignedWebhook, sandboxNotifyBody } from './helpers/cinetpay';
import { createScheduleGoalFixture } from './helpers/fixtures';

describe('E2E — Paiement délégué & webhook CinetPay', () => {
  let ctx: E2eContext | null;
  let paymentLinks: PaymentLinksService;
  let mobileMoney: MobileMoneyAdapter;
  let ledger: LedgerPort;

  beforeAll(async () => {
    ctx = await bootE2eApp();
    if (ctx) {
      paymentLinks = ctx.moduleRef.get(PaymentLinksService);
      mobileMoney = ctx.moduleRef.get(MobileMoneyAdapter);
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

  it('aucune route n’accepte un statut de paiement non signé', async () => {
    if (!ensureE2eDb(ctx)) return;

    const fixture = await createScheduleGoalFixture(ctx, {
      targetAmount: 100,
      installmentCount: 1,
    });
    const installmentId = fixture.installments[0].id;

    const link = await paymentLinks.create({
      installmentId,
      phone: '+2250700999888',
      operator: 'OM',
    });

    // Ancien callback non signé — doit être absent (404).
    await request(ctx.app.getHttpServer())
      .post(`/api/payment-links/public/${link.token}/callback`)
      .send({
        status: 'success',
        payerName: 'Forged',
        payerPhone: '+2250700999888',
        payerOperator: 'OM',
      })
      .expect(404);

    const entryCount = await ctx.prisma.ledgerEntry.count({
      where: { accountId: fixture.ledgerAccountId },
    });
    expect(entryCount).toBe(0);
    await expect(ledger.getBalance(fixture.ledgerAccountId)).resolves.toBe(0);
  });

  it('webhook HMAC invalide → 401, aucune écriture ledger', async () => {
    if (!ensureE2eDb(ctx)) return;

    const fixture = await createScheduleGoalFixture(ctx, {
      targetAmount: 80,
      installmentCount: 1,
    });
    const link = await paymentLinks.create({
      installmentId: fixture.installments[0].id,
      phone: '+2250700888777',
      operator: 'MTN',
    });

    const collection = await ctx.prisma.mobileMoneyCollection.findUniqueOrThrow(
      {
        where: { id: link.mobileMoneyCollectionId! },
      },
    );

    const before = await ctx.prisma.ledgerEntry.count();
    const body = sandboxNotifyBody({
      providerRef: collection.providerRef,
      amount: Number(collection.amount),
      phone: collection.phone,
      collectionId: collection.id,
    });

    await request(ctx.app.getHttpServer())
      .post('/api/ledger-adapter/mobile-money/webhook')
      .set('x-token', 'forged-invalid-hmac-token')
      .send(body)
      .expect(401);

    const after = await ctx.prisma.ledgerEntry.count();
    expect(after).toBe(before);
    expect(collection.status).not.toBe(MobileMoneyCollectionStatus.confirmed);
  });

  it('rejouer le même webhook confirmé → un seul crédit ledger (idempotence)', async () => {
    if (!ensureE2eDb(ctx)) return;

    const fixture = await createScheduleGoalFixture(ctx, {
      targetAmount: 120,
      installmentCount: 1,
    });
    const link = await paymentLinks.create({
      installmentId: fixture.installments[0].id,
      phone: '+2250700777666',
      operator: 'OM',
      payerName: 'Tiers',
    });

    const collection = await ctx.prisma.mobileMoneyCollection.findUniqueOrThrow(
      {
        where: { id: link.mobileMoneyCollectionId! },
      },
    );

    const first = await mobileMoney.simulateSandboxCallback(
      collection.providerRef,
      true,
    );
    expect(first.ledgerCredited).toBe(true);

    const creditsAfterFirst = await ctx.prisma.ledgerEntry.count({
      where: {
        accountId: fixture.ledgerAccountId,
        type: 'credit',
      },
    });
    expect(creditsAfterFirst).toBe(1);
    await expect(ledger.getBalance(fixture.ledgerAccountId)).resolves.toBe(120);

    const second = await mobileMoney.simulateSandboxCallback(
      collection.providerRef,
      true,
    );
    expect(second.ledgerCredited).toBe(false);

    // Aussi via HTTP avec HMAC valide rejoué.
    const replayBody = sandboxNotifyBody({
      providerRef: collection.providerRef,
      amount: 120,
      phone: collection.phone,
      collectionId: collection.id,
    });
    const { token } = buildSignedWebhook(replayBody);

    await request(ctx.app.getHttpServer())
      .post('/api/ledger-adapter/mobile-money/webhook')
      .set('x-token', token)
      .send(replayBody)
      .expect(201);

    const creditsAfterReplay = await ctx.prisma.ledgerEntry.count({
      where: {
        accountId: fixture.ledgerAccountId,
        type: 'credit',
      },
    });
    expect(creditsAfterReplay).toBe(1);
    await expect(ledger.getBalance(fixture.ledgerAccountId)).resolves.toBe(120);
  });
});
