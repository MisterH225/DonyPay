import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const rows: Array<Record<string, unknown>> = [];

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
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  it('should return hello-world payload', () => {
    expect(service.getHello()).toEqual({
      module: 'notifications',
      message: 'Hello from notifications module',
    });
  });

  it('creates and lists notifications for a user', async () => {
    await service.notify({
      userId: 'seller-1',
      type: 'savings.ready_for_withdrawal',
      title: 'Objectif atteint',
      body: 'Un acheteur a terminé son épargne',
    });

    const list = await service.listForUser('seller-1');
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe('savings.ready_for_withdrawal');
  });

  it('marks a notification as read', async () => {
    const created = await service.notify({
      userId: 'seller-1',
      type: 'test',
      title: 't',
      body: 'b',
    });

    const updated = await service.markRead(created.id);
    expect(updated.readAt).toBeInstanceOf(Date);
  });

  it('throws when notification is missing', async () => {
    await expect(service.markRead('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
