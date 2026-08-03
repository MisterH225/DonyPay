import {
  BadRequestException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import {
  InstallmentStatus,
  PaymentLinkStatus,
  Prisma,
  SavingsMode,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SavingsGoalsService } from '../savings-engine/savings-goals.service';
import { PaymentLinksService } from './payment-links.service';

describe('PaymentLinksService', () => {
  let service: PaymentLinksService;
  let savingsGoals: { recordDeposit: jest.Mock };
  let notifications: { notifyPaymentLinkPaidByThirdParty: jest.Mock };
  let links: Array<Record<string, unknown>>;
  let installment: Record<string, unknown>;
  let prisma: Record<string, any>;

  beforeEach(() => {
    process.env.PAYMENT_LINK_TTL_HOURS = '48';

    installment = {
      id: 'inst-1',
      goalId: 'goal-1',
      sequence: 1,
      dueDate: new Date('2026-09-01'),
      amount: new Prisma.Decimal(40),
      status: InstallmentStatus.pending,
      payerName: null,
      payerPhone: null,
      payerOperator: null,
      goal: {
        id: 'goal-1',
        goalId: 'goal-1',
        mode: SavingsMode.schedule,
        user: { id: 'buyer-1', phone: '+2250700000000' },
        product: {
          name: 'Sneakers',
          shop: { name: 'Boutique Alice', sellerId: 'seller-1' },
        },
      },
    };

    links = [];

    savingsGoals = {
      recordDeposit: jest.fn(async () => ({ id: 'goal-1' })),
    };

    notifications = {
      notifyPaymentLinkPaidByThirdParty: jest.fn(async () => ({ id: 'n-1' })),
    };

    prisma = {
      savingsInstallment: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
          return where.id === installment.id ? installment : null;
        }),
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            if (where.id === installment.id) {
              installment = { ...installment, ...data };
            }
            return installment;
          },
        ),
      },
      paymentLink: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const link = {
            id: 'link-1',
            status: PaymentLinkStatus.pending,
            usedAt: null,
            payerName: null,
            payerPhone: null,
            payerOperator: null,
            providerRef: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          links.push(link);
          return link;
        }),
        findUnique: jest.fn(async ({ where }: { where: { token: string } }) => {
          const link = links.find((item) => item.token === where.token);
          if (!link) return null;
          return {
            ...link,
            installment: { ...installment },
          };
        }),
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            const idx = links.findIndex((item) => item.id === where.id);
            links[idx] = { ...links[idx], ...data };
            return links[idx];
          },
        ),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
      $transaction: jest.fn(async (ops: unknown) => {
        if (Array.isArray(ops)) {
          return Promise.all(ops);
        }
        return (ops as (tx: unknown) => Promise<unknown>)(prisma);
      }),
    };

    service = new PaymentLinksService(
      prisma as unknown as PrismaService,
      savingsGoals as unknown as SavingsGoalsService,
      notifications as unknown as import('../notifications').NotificationsService,
    );
  });

  it('should return hello-world payload', () => {
    expect(service.getHello()).toEqual({
      module: 'payment-links',
      message: 'Hello from payment-links module',
    });
  });

  it('creates a one-time link with frozen amount and 48h expiry', async () => {
    const created = await service.create({ installmentId: 'inst-1' });

    expect(created.amount).toBe('40');
    expect(created.ttlHours).toBe(48);
    expect(created.publicUrl).toContain(created.token);
    expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('returns public page data without requiring an account', async () => {
    const created = await service.create({ installmentId: 'inst-1' });
    const page = await service.getPublicPage(created.token);

    expect(page.requiresAccount).toBe(false);
    expect(page.amount).toBe('40');
    expect(page.productName).toBe('Sneakers');
  });

  it('confirms mobile money callback, attaches payer, and records ledger deposit', async () => {
    const created = await service.create({ installmentId: 'inst-1' });

    const result = await service.handleMobileMoneyCallback(created.token, {
      status: 'success',
      payerName: 'Jean Dupont',
      payerPhone: '+2250700000000',
      payerOperator: 'Orange',
      providerRef: 'mm-123',
    });

    expect(savingsGoals.recordDeposit).toHaveBeenCalledWith('goal-1', {
      amount: 40,
      installmentId: 'inst-1',
    });
    expect(result.status).toBe(PaymentLinkStatus.paid);
    expect(result.payer).toEqual({
      name: 'Jean Dupont',
      phone: '+2250700000000',
      operator: 'Orange',
    });
    expect(installment.payerName).toBe('Jean Dupont');
    // même numéro que le owner → pas de notif "tiers"
    expect(
      notifications.notifyPaymentLinkPaidByThirdParty,
    ).not.toHaveBeenCalled();
  });

  it('notifies owner when payment link is paid by a third party', async () => {
    const created = await service.create({ installmentId: 'inst-1' });

    await service.handleMobileMoneyCallback(created.token, {
      status: 'success',
      payerName: 'Marie',
      payerPhone: '+2250800000000',
      payerOperator: 'MTN',
    });

    expect(
      notifications.notifyPaymentLinkPaidByThirdParty,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'buyer-1',
      }),
    );
  });

  it('rejects reuse of a paid link', async () => {
    const created = await service.create({ installmentId: 'inst-1' });
    await service.handleMobileMoneyCallback(created.token, {
      status: 'success',
      payerName: 'Jean Dupont',
      payerPhone: '+2250700000000',
      payerOperator: 'Orange',
    });

    await expect(
      service.handleMobileMoneyCallback(created.token, {
        status: 'success',
        payerName: 'Jean Dupont',
        payerPhone: '+2250700000000',
        payerOperator: 'Orange',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects expired links', async () => {
    const created = await service.create({ installmentId: 'inst-1' });
    links[0].expiresAt = new Date(Date.now() - 1000);

    await expect(service.getPublicPage(created.token)).rejects.toBeInstanceOf(
      GoneException,
    );
    expect(prisma.paymentLink.update).toHaveBeenCalledWith({
      where: { id: 'link-1' },
      data: { status: PaymentLinkStatus.expired },
    });
    expect(links[0].status).toBe(PaymentLinkStatus.expired);
  });

  it('propagates refreshExpired update failures', async () => {
    const created = await service.create({ installmentId: 'inst-1' });
    links[0].expiresAt = new Date(Date.now() - 1000);
    prisma.paymentLink.update.mockRejectedValueOnce(new Error('db write failed'));

    await expect(service.getPublicPage(created.token)).rejects.toThrow(
      'db write failed',
    );
    expect(links[0].status).toBe(PaymentLinkStatus.pending);
  });

  it('throws when installment is missing', async () => {
    await expect(
      service.create({ installmentId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
