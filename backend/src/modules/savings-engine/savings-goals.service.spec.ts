import { BadRequestException } from '@nestjs/common';
import {
  InstallmentStatus,
  Prisma,
  SavingsGoalStatus,
  SavingsMode,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { LedgerPort } from '../ledger-adapter';
import { NotificationsService } from '../notifications';
import { SavingsGoalsService } from './savings-goals.service';

describe('SavingsGoalsService', () => {
  let service: SavingsGoalsService;
  let ledger: jest.Mocked<LedgerPort>;
  let notifications: {
    notifyDepositReceived: jest.Mock;
    notifyGoalReached: jest.Mock;
    notifyInstallmentDue: jest.Mock;
    notifyPlanCancelled: jest.Mock;
  };
  let goal: Record<string, unknown>;
  let installments: Array<Record<string, unknown>>;
  let prisma: Record<string, unknown>;

  const product = {
    id: 'product-1',
    shopId: 'shop-1',
    name: 'Sneakers',
    price: new Prisma.Decimal(100),
    photoKey: null,
    qrPayload: 'x',
    qrCodeKey: 'y',
    createdAt: new Date(),
    updatedAt: new Date(),
    shop: {
      sellerId: 'seller-1',
      name: 'Boutique',
      seller: { phone: '+2250100000000' },
    },
  };

  const user = {
    id: 'buyer-1',
    phone: '+2250700000000',
    email: 'buyer@example.com',
  };

  beforeEach(() => {
    installments = [];
    goal = {
      id: 'goal-1',
      userId: 'buyer-1',
      productId: 'product-1',
      mode: SavingsMode.flexi,
      targetAmount: new Prisma.Decimal(100),
      savedAmount: new Prisma.Decimal(0),
      status: SavingsGoalStatus.active,
      ledgerAccountId: 'ledger-acc-1',
      flexiStartsAt: new Date(Date.now() - 60_000),
      flexiEndsAt: new Date(Date.now() + 86_400_000),
      readyAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      installments,
      product,
      user,
    };

    ledger = {
      openSavingsAccount: jest.fn(async () => 'ledger-acc-1'),
      recordDeposit: jest.fn(async () => undefined),
      getBalance: jest.fn(async () => 0),
      recordWithdrawal: jest.fn(async () => undefined),
    };

    notifications = {
      notifyDepositReceived: jest.fn(async (dto) => ({ id: 'notif-dep', ...dto })),
      notifyGoalReached: jest.fn(async (dto) => ({ id: 'notif-goal', ...dto })),
      notifyInstallmentDue: jest.fn(async (dto) => ({ id: 'notif-due', ...dto })),
      notifyPlanCancelled: jest.fn(async (dto) => ({ id: 'notif-cancel', ...dto })),
    };

    prisma = {
      user: {
        findUnique: jest.fn(async () => ({ id: 'buyer-1' })),
      },
      product: {
        findUnique: jest.fn(async () => product),
      },
      savingsGoal: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          if (
            data.installments &&
            typeof data.installments === 'object' &&
            'create' in (data.installments as object)
          ) {
            const create = (
              data.installments as { create: Array<Record<string, unknown>> }
            ).create;
            installments.splice(
              0,
              installments.length,
              ...create.map((item, index) => ({
                id: `inst-${index + 1}`,
                goalId: 'goal-1',
                status: InstallmentStatus.pending,
                reminderSentAt: null,
                paidAt: null,
                createdAt: new Date(),
                ...item,
              })),
            );
          }
          goal = {
            ...goal,
            ...data,
            installments: [...installments],
            product,
            user,
            id: 'goal-1',
            savedAmount: new Prisma.Decimal(0),
            status: SavingsGoalStatus.active,
            ledgerAccountId: data.ledgerAccountId,
          };
          return {
            ...goal,
            installments: [...installments],
            product,
            user,
          };
        }),
        findUnique: jest.fn(async () => ({
          ...goal,
          installments: [...installments],
          product,
          user,
        })),
        findMany: jest.fn(async () => [{ ...goal }]),
        update: jest.fn(
          async ({ data }: { data: Record<string, unknown> }) => ({
            ...goal,
            ...data,
            status: (data.status as SavingsGoalStatus) ?? goal.status,
            installments: [...installments],
            product,
            user,
            deposits: [],
          }),
        ),
      },
      savingsInstallment: {
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            const idx = installments.findIndex((item) => item.id === where.id);
            installments[idx] = { ...installments[idx], ...data };
            return installments[idx];
          },
        ),
        findMany: jest.fn(async () => []),
      },
      savingsDeposit: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'dep-1',
          createdAt: new Date(),
          ...data,
        })),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(prisma),
      ),
    };

    service = new SavingsGoalsService(
      prisma as unknown as PrismaService,
      ledger,
      notifications as unknown as NotificationsService,
    );
  });

  it('creates a flexi goal with target amount = product price', async () => {
    const created = await service.create({
      userId: 'buyer-1',
      productId: 'product-1',
      mode: SavingsMode.flexi,
      flexiStartsAt: new Date().toISOString(),
      flexiEndsAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    expect(ledger.openSavingsAccount).toHaveBeenCalledWith('buyer-1');
    expect(created.targetAmount).toEqual(new Prisma.Decimal(100));
    expect(created.mode).toBe(SavingsMode.flexi);
  });

  it('records a deposit, notifies deposit_received and goal_reached', async () => {
    goal.mode = SavingsMode.flexi;
    goal.savedAmount = new Prisma.Decimal(0);

    const updated = await service.recordDeposit('goal-1', { amount: 100 });

    expect(ledger.recordDeposit).toHaveBeenCalledWith(
      'ledger-acc-1',
      100,
      expect.objectContaining({ goalId: 'goal-1' }),
    );
    expect(updated.status).toBe(SavingsGoalStatus.ready_for_withdrawal);
    expect(notifications.notifyDepositReceived).toHaveBeenCalled();
    expect(notifications.notifyGoalReached).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'seller-1',
      }),
    );
  });

  it('cancels a plan and notifies plan_cancelled', async () => {
    const cancelled = await service.cancel('goal-1');
    expect(cancelled.status).toBe(SavingsGoalStatus.cancelled);
    expect(notifications.notifyPlanCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'buyer-1' }),
    );
  });

  it('rejects flexi deposits outside the period', async () => {
    goal.flexiStartsAt = new Date(Date.now() + 86_400_000);
    goal.flexiEndsAt = new Date(Date.now() + 2 * 86_400_000);

    await expect(
      service.recordDeposit('goal-1', { amount: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ledger.recordDeposit).not.toHaveBeenCalled();
  });

  it('dispatches installment_due reminders', async () => {
    const due = {
      id: 'inst-1',
      goalId: 'goal-1',
      amount: new Prisma.Decimal(40),
      dueDate: new Date(),
      status: InstallmentStatus.pending,
      reminderSentAt: null,
      goal: {
        userId: 'buyer-1',
        user: { phone: '+2250700000000' },
        product: { name: 'Sneakers' },
      },
    };

    (prisma.savingsInstallment as { findMany: jest.Mock }).findMany.mockResolvedValue(
      [due],
    );

    const result = await service.dispatchDueReminders();

    expect(result.count).toBe(1);
    expect(notifications.notifyInstallmentDue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'buyer-1',
      }),
    );
  });
});
