import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import { TwoFactorMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SMS_SENDER_PORT, type SmsSenderPort } from './ports/sms-sender.port';
import { UsersService } from './users.service';

const SMS_CODE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    @Inject(SMS_SENDER_PORT)
    private readonly smsSender: SmsSenderPort,
  ) {}

  async setupTotp(userId: string) {
    const user = await this.usersService.findById(userId);
    const secret = generateSecret();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: secret,
        twoFactorEnabled: false,
        twoFactorMethod: TwoFactorMethod.totp,
      },
    });

    const otpauthUrl = generateURI({
      issuer: 'DonyPay',
      label: user.email,
      secret,
    });

    return {
      secret,
      otpauthUrl,
      message: 'Confirm TOTP with a valid code to enable 2FA',
    };
  }

  async confirmTotp(userId: string, code: string) {
    const user = await this.usersService.findById(userId);

    if (!user.totpSecret || user.twoFactorMethod !== TwoFactorMethod.totp) {
      throw new BadRequestException('TOTP setup has not been started');
    }

    const result = await verify({
      token: code,
      secret: user.totpSecret,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: TwoFactorMethod.totp,
      },
    });

    return {
      userId: updated.id,
      twoFactorEnabled: updated.twoFactorEnabled,
      twoFactorMethod: updated.twoFactorMethod,
    };
  }

  async enableSms(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user.phone?.trim()) {
      throw new BadRequestException('Phone number is required for SMS 2FA');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: TwoFactorMethod.sms,
        totpSecret: null,
      },
    });

    return {
      userId: updated.id,
      twoFactorEnabled: updated.twoFactorEnabled,
      twoFactorMethod: updated.twoFactorMethod,
    };
  }

  async sendSmsCode(userId: string) {
    const user = await this.usersService.findById(userId);

    if (
      !user.twoFactorEnabled ||
      user.twoFactorMethod !== TwoFactorMethod.sms
    ) {
      throw new BadRequestException('SMS 2FA is not enabled for this user');
    }

    if (!user.phone) {
      throw new BadRequestException('Phone number is required for SMS 2FA');
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + SMS_CODE_TTL_MS);

    await this.prisma.twoFactorChallenge.create({
      data: {
        userId,
        method: TwoFactorMethod.sms,
        codeHash: this.hashCode(code),
        expiresAt,
      },
    });

    await this.smsSender.sendSms(user.phone, `Votre code DonyPay : ${code}`);

    return {
      userId,
      method: TwoFactorMethod.sms,
      expiresAt,
      message: 'SMS code sent',
      // Staging / local uniquement — jamais en production.
      ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
    };
  }

  async verify(userId: string, code: string) {
    const user = await this.usersService.findById(userId);

    if (!user.twoFactorEnabled || !user.twoFactorMethod) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    if (user.twoFactorMethod === TwoFactorMethod.totp) {
      return this.verifyTotp(userId, user.totpSecret, code);
    }

    return this.verifySms(userId, code);
  }

  private async verifyTotp(
    userId: string,
    secret: string | null,
    code: string,
  ) {
    if (!secret) {
      throw new BadRequestException('TOTP secret is missing');
    }

    const result = await verify({ token: code, secret });
    if (!result.valid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    return { userId, verified: true, method: TwoFactorMethod.totp };
  }

  private async verifySms(userId: string, code: string) {
    const challenge = await this.prisma.twoFactorChallenge.findFirst({
      where: {
        userId,
        method: TwoFactorMethod.sms,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge?.codeHash) {
      throw new UnauthorizedException('No active SMS challenge');
    }

    if (challenge.codeHash !== this.hashCode(code)) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.twoFactorChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    return { userId, verified: true, method: TwoFactorMethod.sms };
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
