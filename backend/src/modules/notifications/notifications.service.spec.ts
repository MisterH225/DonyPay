import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import {
  NotificationChannel,
  NotificationEventType,
  type NotificationPort,
} from './ports/notification.port';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const rows: Array<Record<string, unknown>> = [];
  let notifier: jest.Mocked<NotificationPort>;

  const prisma = {
    notification: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `n-${rows.length + 1}`,
          createdAt: new Date(),
          readAt: null,
          ...data,
        };
        rows.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        return rows.filter((row) => row.userId === where.userId);
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        return rows.find((row) => row.id === where.id) ?? null;
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const idx = rows.findIndex((row) => row.id === where.id);
          rows[idx] = { ...rows[idx], ...data };
          return rows[idx];
        },
      ),
    },
  };

  beforeEach(() => {
    rows.length = 0;
    jest.clearAllMocks();
    notifier = { send: jest.fn(async () => undefined) };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      notifier,
    );
  });

  it('should return hello-world payload', () => {
    expect(service.getHello()).toEqual({
      module: 'notifications',
      message: 'Hello from notifications module',
    });
  });

  it('emits deposit_received via NotificationPort on SMS + push', async () => {
    const record = await service.notifyDepositReceived({
      userId: 'buyer-1',
      phone: '+2250700000000',
      title: 'Versement reçu',
      body: 'Paiement OK',
    });

    expect(record.type).toBe(NotificationEventType.deposit_received);
    expect(notifier.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NotificationEventType.deposit_received,
        channels: [NotificationChannel.sms, NotificationChannel.push],
        phone: '+2250700000000',
      }),
    );
  });

  it.each([
    [
      'goal_reached',
      () =>
        service.notifyGoalReached({
          userId: 'seller-1',
          title: 'Objectif atteint',
          body: 'Prêt',
        }),
      NotificationEventType.goal_reached,
    ],
    [
      'installment_due',
      () =>
        service.notifyInstallmentDue({
          userId: 'buyer-1',
          title: 'Échéance',
          body: 'Bientôt',
        }),
      NotificationEventType.installment_due,
    ],
    [
      'payment_link_paid_by_third_party',
      () =>
        service.notifyPaymentLinkPaidByThirdParty({
          userId: 'buyer-1',
          title: 'Tiers',
          body: 'Payé',
        }),
      NotificationEventType.payment_link_paid_by_third_party,
    ],
    [
      'plan_cancelled',
      () =>
        service.notifyPlanCancelled({
          userId: 'buyer-1',
          title: 'Annulé',
          body: 'Stop',
        }),
      NotificationEventType.plan_cancelled,
    ],
    [
      'product_handed_over',
      () =>
        service.notifyProductHandedOver({
          userId: 'buyer-1',
          title: 'Remis',
          body: 'Produit remis',
        }),
      NotificationEventType.product_handed_over,
    ],
  ] as const)('supports trigger %s', async (_name, run, event) => {
    const record = await run();
    expect(record.type).toBe(event);
    expect(notifier.send).toHaveBeenCalledWith(
      expect.objectContaining({ event }),
    );
  });

  it('lists and marks notifications as read', async () => {
    const created = await service.notifyGoalReached({
      userId: 'seller-1',
      title: 't',
      body: 'b',
    });

    const list = await service.listForUser('seller-1');
    expect(list).toHaveLength(1);

    const updated = await service.markRead(created.id);
    expect(updated.readAt).toBeInstanceOf(Date);
  });

  it('throws when notification is missing', async () => {
    await expect(service.markRead('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
