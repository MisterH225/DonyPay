import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopsService } from './shops.service';

describe('ShopsService', () => {
  let service: ShopsService;
  const users = new Map<string, { id: string }>();
  const shops = new Map<string, Record<string, unknown>>();

  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        return users.get(where.id) ?? null;
      }),
    },
    shop: {
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: { id?: string; sellerId?: string };
        }) => {
          if (where.id) return shops.get(where.id) ?? null;
          if (where.sellerId) {
            return (
              [...shops.values()].find(
                (shop) => shop.sellerId === where.sellerId,
              ) ?? null
            );
          }
          return null;
        },
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const shop = {
          id: 'shop-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        shops.set(shop.id as string, shop);
        return shop;
      }),
    },
  };

  beforeEach(() => {
    users.clear();
    shops.clear();
    jest.clearAllMocks();
    users.set('seller-1', { id: 'seller-1' });
    service = new ShopsService(prisma as unknown as PrismaService);
  });

  it('creates a shop for a seller', async () => {
    const shop = await service.create({
      sellerId: 'seller-1',
      name: 'Boutique Alice',
      description: 'Mode',
    });

    expect(shop.name).toBe('Boutique Alice');
    expect(shop.sellerId).toBe('seller-1');
  });

  it('enforces one shop per seller', async () => {
    await service.create({ sellerId: 'seller-1', name: 'Boutique A' });

    await expect(
      service.create({ sellerId: 'seller-1', name: 'Boutique B' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects unknown seller', async () => {
    await expect(
      service.create({ sellerId: 'missing', name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('finds shop by seller', async () => {
    await service.create({ sellerId: 'seller-1', name: 'Boutique A' });
    const shop = await service.findBySellerId('seller-1');
    expect(shop.name).toBe('Boutique A');
  });
});
