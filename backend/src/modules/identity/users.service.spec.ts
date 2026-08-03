import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserType, KycStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const users = new Map<string, Record<string, unknown>>();

  const prisma = {
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { id?: string; email?: string } }) => {
          if (where.id) return users.get(where.id) ?? null;
          if (where.email) {
            return (
              [...users.values()].find((user) => user.email === where.email) ??
              null
            );
          }
          return null;
        },
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const user = {
          id: 'user-1',
          kycStatus: KycStatus.pending,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        users.set(user.id, user);
        return user;
      }),
    },
  };

  beforeEach(() => {
    users.clear();
    jest.clearAllMocks();
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('creates an individual user with pending KYC', async () => {
    const user = await service.create({
      email: 'alice@example.com',
      type: UserType.individual,
      firstName: 'Alice',
      lastName: 'Martin',
    });

    expect(user.email).toBe('alice@example.com');
    expect(user.type).toBe(UserType.individual);
    expect(user.kycStatus).toBe(KycStatus.pending);
  });

  it('creates a company user', async () => {
    const user = await service.create({
      email: 'corp@example.com',
      type: UserType.company,
      companyName: 'DonyPay SAS',
      siret: '12345678900012',
    });

    expect(user.type).toBe(UserType.company);
    expect(user.companyName).toBe('DonyPay SAS');
  });

  it('rejects duplicate emails', async () => {
    await service.create({
      email: 'alice@example.com',
      type: UserType.individual,
      firstName: 'Alice',
      lastName: 'Martin',
    });

    await expect(
      service.create({
        email: 'alice@example.com',
        type: UserType.individual,
        firstName: 'Alice',
        lastName: 'Martin',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when user is missing', async () => {
    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
