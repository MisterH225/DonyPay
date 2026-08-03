import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TwoFactorMethod } from '@prisma/client';
import { TwoFactorService } from '../identity/two-factor.service';
import { UsersService } from '../identity/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock; findById: jest.Mock };
  let twoFactor: { verify: jest.Mock; sendSmsCode: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  const user = {
    id: 'user-1',
    email: 'awa@donypay.test',
    twoFactorEnabled: true,
    twoFactorMethod: TwoFactorMethod.totp,
  };

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(async () => ({ ...user })),
      findById: jest.fn(async () => ({ ...user })),
    };
    twoFactor = {
      verify: jest.fn(async () => ({
        userId: user.id,
        verified: true,
        method: TwoFactorMethod.totp,
      })),
      sendSmsCode: jest.fn(async () => ({
        userId: user.id,
        expiresAt: new Date(),
        message: 'SMS code sent',
      })),
    };
    jwt = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access.jwt')
        .mockResolvedValueOnce('refresh.jwt'),
      verifyAsync: jest.fn(),
    };

    const config = {
      get: (key: string) => {
        const map: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_TTL: '900',
          JWT_REFRESH_TTL: '604800',
        };
        return map[key];
      },
    } as unknown as ConfigService;

    service = new AuthService(
      users as unknown as UsersService,
      twoFactor as unknown as TwoFactorService,
      jwt as unknown as JwtService,
      config,
    );
  });

  it('login verifies OTP then issues token pair', async () => {
    const result = await service.login(user.email, '123456');

    expect(twoFactor.verify).toHaveBeenCalledWith(user.id, '123456');
    expect(result.accessToken).toBe('access.jwt');
    expect(result.refreshToken).toBe('refresh.jwt');
    expect(result.user).toEqual({ id: user.id, email: user.email });
  });

  it('rejects login when 2FA is disabled', async () => {
    users.findByEmail.mockResolvedValueOnce({
      ...user,
      twoFactorEnabled: false,
      twoFactorMethod: null,
    });

    await expect(service.login(user.email, '123456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refresh rotates tokens from a valid refresh JWT', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({
      sub: user.id,
      email: user.email,
      typ: 'refresh',
    });
    jwt.signAsync.mockReset();
    jwt.signAsync
      .mockResolvedValueOnce('access.2')
      .mockResolvedValueOnce('refresh.2');

    const result = await service.refresh('old.refresh');
    expect(result.accessToken).toBe('access.2');
    expect(jwt.verifyAsync).toHaveBeenCalledWith('old.refresh', {
      secret: 'refresh-secret',
    });
  });

  it('rejects refresh token with wrong typ', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({
      sub: user.id,
      email: user.email,
      typ: 'access',
    });

    await expect(service.refresh('bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
