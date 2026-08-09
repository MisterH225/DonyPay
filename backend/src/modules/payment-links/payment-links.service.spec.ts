import {
  BadRequestException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import {
  InstallmentStatus,
  MobileMoneyCollectionStatus,
  PaymentLinkStatus,
  Prisma,
  SavingsMode,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MobileMoneyAdapter } from '../ledger-adapter';
import { SavingsGoalsService } from '../savings-engine/savings-goals.service';
import { PaymentLinksService } from './payment-links.service';

describe('PaymentLinksService', () => {
  let service: PaymentLinksService;
  let savingsGoals: {
    applyDepositAlreadyOnLedger: jest.Mock;
  };
  let notifications: { notifyPaymentLinkPaidByThirdParty: jest.Mock };
  let mobileMoney: { initiateCollection: jest.Mock };
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
        ledgerAccountId: 'ledger-1',
        user: { id: 'buyer-1', phone: '+2250700000000' },
        product: {
          name: 'Sneakers',
          shop: { name: 'Boutique Alice', sellerId: 'seller-1' },
        },
      },
    };

    links = [];

    savingsGoals = {
      applyDepositAlreadyOnLedger: jest.fn(async () => ({ id: 'goal-1' })),
    };

    notifications = {
      notifyPaymentLinkPaidByThirdParty: jest.fn(async () => ({ id: 'n-1' })),
    };

    mobileMoney = {
      initiateCollection: jest.fn(async () => ({
        collectionId: 'col-1',
        providerRef: 'dp_ref_1',
        status: MobileMoneyCollectionStatus.ussd_sent,
        ussdHint: '#144*sandbox#',
        paymentUrl: undefined,
        sandbox: true,
      })),
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
      mobileMoneyCollection: {
        findUnique: jest.fn(async () => ({
          id: 'col-1',
          ussdHint: '#144*sandbox#',
          status: MobileMoneyCollectionStatus.ussd_sent,
        })),
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
            mobileMoneyCollectionId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          links.push(link);
          return link;
        }),
        findUnique: jest.fn(
          async ({
            where,
          }: {
            where: { token?: string; id?: string };
          }) => {
            const link = links.find((item) =>
              where.token
                ? item.token === where.token
                : item.id === where.id,
            );
            if (!link) return null;
            return {
              ...link,
              installment: { ...installment },
            };
          },
        ),
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
      mobileMoney as unknown as MobileMoneyAdapter,
    );
  });

  it('should return hello-world payload', () => {
    expect(service.getHello()).toEqual({
      module: 'payment-links',
      message: 'Hello from payment-links module',
    });
  });

  it('creates a link and initiates Mobile Money collection on goal ledger', async () => {
    const created = await service.create({ installmentId: 'inst-1' });

    expect(created.amount).toBe('40');
    expect(created.ttlHours).toBe(48);
    expect(created.publicUrl).toContain(created.token);
    expect(created.mobileMoneyCollectionId).toBe('col-1');
    expect(created.collection.status).toBe(
      MobileMoneyCollectionStatus.ussd_sent,
    );
    expect(mobileMoney.initiateCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'ledger-1',
        amount: 40,
        phone: '+2250700000000',
        metadata: expect.objectContaining({
          paymentLinkId: 'link-1',
          installmentId: 'inst-1',
        }),
      }),
    );
  });

  it('returns public page data without requiring an account', async () => {
    const created = await service.create({ installmentId: 'inst-1' });
    const page = await service.getPublicPage(created.token);

    expect(page.requiresAccount).toBe(false);
    expect(page.amount).toBe('40');
    expect(page.productName).toBe('Sneakers');
    expect(page.ussdHint).toContain('sandbox');
  });

  it('marks paid from collection without re-crediting ledger', async () => {
    await service.create({ installmentId: 'inst-1' });

    const result = await service.markPaidFromCollection({
      paymentLinkId: 'link-1',
      providerRef: 'dp_ref_1',
      payerName: 'Jean Dupont',
      payerPhone: '+2250700000000',
      payerOperator: 'Orange',
    });

    expect(savingsGoals.applyDepositAlreadyOnLedger).toHaveBeenCalledWith(
      'goal-1',
      { amount: 40, installmentId: 'inst-1' },
    );
    expect(result.status).toBe(PaymentLinkStatus.paid);
    expect(result.payer).toEqual({
      name: 'Jean Dupont',
      phone: '+2250700000000',
      operator: 'Orange',
    });
    expect(
      notifications.notifyPaymentLinkPaidByThirdParty,
    ).not.toHaveBeenCalled();
  });

  it('notifies owner when payment link is paid by a third party', async () => {
    await service.create({ installmentId: 'inst-1' });

    await service.markPaidFromCollection({
      paymentLinkId: 'link-1',
      providerRef: 'dp_ref_1',
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

  it('is idempotent when link already paid', async () => {
    await service.create({ installmentId: 'inst-1' });
    await service.markPaidFromCollection({
      paymentLinkId: 'link-1',
      providerRef: 'dp_ref_1',
      payerName: 'Jean Dupont',
      payerPhone: '+2250700000000',
      payerOperator: 'Orange',
    });

    const second = await service.markPaidFromCollection({
      paymentLinkId: 'link-1',
      providerRef: 'dp_ref_1',
      payerName: 'Jean Dupont',
      payerPhone: '+2250700000000',
      payerOperator: 'Orange',
    });

    expect(second.status).toBe(PaymentLinkStatus.paid);
    expect(savingsGoals.applyDepositAlreadyOnLedger).toHaveBeenCalledTimes(1);
  });

  it('rejects expired links on public page', async () => {
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

  it('throws when no phone is available for collection', async () => {
    (installment.goal as { user: { phone: string | null } }).user.phone = null;

    await expect(
      service.create({ installmentId: 'inst-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
