import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { generate, generateSecret } from 'otplib';
import {
  KycStatus,
  TwoFactorMethod,
  UserType,
  type User,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { SmsSenderPort } from './ports/sms-sender.port';
import { TwoFactorService } from './two-factor.service';
import { UsersService } from './users.service';

describe('TwoFactorService', () => {
  let user: User;
  let challenges: Array<Record<string, unknown>>;
  let prisma: {
    user: { update: jest.Mock };
    twoFactorChallenge: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let smsSender: SmsSenderPort;
  let usersService: UsersService;
  let service: TwoFactorService;

  beforeEach(() => {
    user = {
      id: 'user-1',
      email: 'alice@example.com',
      phone: '+33600000000',
      type: UserType.individual,
      firstName: 'Alice',
      lastName: 'Martin',
      companyName: null,
      siret: null,
      kycStatus: KycStatus.pending,
      kycReviewedAt: null,
      kycRejectReason: null,
      externalKycId: null,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      totpSecret: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    challenges = [];

    prisma = {
      user: {
        update: jest.fn(async ({ data }: { data: Partial<User> }) => {
          user = { ...user, ...data };
          return user;
        }),
      },
      twoFactorChallenge: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: 'challenge-1', consumedAt: null, ...data };
          challenges.push(row);
          return row;
        }),
        findFirst: jest.fn(async () => {
          return (
            challenges.find(
              (challenge) =>
                challenge.consumedAt == null &&
                (challenge.expiresAt as Date) > new Date(),
            ) ?? null
          );
        }),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          challenges[0] = { ...challenges[0], ...data };
          return challenges[0];
        }),
      },
    };

    smsSender = { sendSms: jest.fn(async () => undefined) };
    usersService = {
      findById: jest.fn(async () => ({ ...user })),
    } as unknown as UsersService;

    service = new TwoFactorService(
      prisma as unknown as PrismaService,
      usersService,
      smsSender,
    );
  });

  it('sets up TOTP and confirms with a valid code', async () => {
    const setup = await service.setupTotp('user-1');
    expect(setup.secret).toBeDefined();
    expect(setup.otpauthUrl).toContain('otpauth://totp/');

    (usersService.findById as jest.Mock).mockResolvedValue({ ...user });
    const token = await generate({ secret: user.totpSecret! });

    const confirmed = await service.confirmTotp('user-1', token);
    expect(confirmed.twoFactorEnabled).toBe(true);
    expect(confirmed.twoFactorMethod).toBe(TwoFactorMethod.totp);
  });

  it('rejects invalid TOTP confirmation', async () => {
    user.totpSecret = generateSecret();
    user.twoFactorMethod = TwoFactorMethod.totp;
    (usersService.findById as jest.Mock).mockResolvedValue({ ...user });

    await expect(service.confirmTotp('user-1', '000000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('enables SMS 2FA and verifies a sent code', async () => {
    await service.enableSms('user-1');
    expect(user.twoFactorMethod).toBe(TwoFactorMethod.sms);

    (usersService.findById as jest.Mock).mockResolvedValue({ ...user });
    await service.sendSmsCode('user-1');
    expect(smsSender.sendSms).toHaveBeenCalled();

    const message = (smsSender.sendSms as jest.Mock).mock.calls[0][1] as string;
    const code = message.match(/(\d{6})/)?.[1];
    expect(code).toBeDefined();

    const result = await service.verify('user-1', code!);
    expect(result.verified).toBe(true);
    expect(result.method).toBe(TwoFactorMethod.sms);
    expect(challenges[0].codeHash).toBe(
      createHash('sha256').update(code!).digest('hex'),
    );
  });

  it('requires a phone number for SMS 2FA', async () => {
    user.phone = null;
    (usersService.findById as jest.Mock).mockResolvedValue({ ...user });

    await expect(service.enableSms('user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
