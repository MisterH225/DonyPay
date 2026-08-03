import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TwoFactorMethod } from '@prisma/client';
import { TwoFactorService } from '../identity/two-factor.service';
import { UsersService } from '../identity/users.service';
import type { DoniJwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly twoFactorService: TwoFactorService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Première activation SMS 2FA par email (avant le premier login JWT).
   * Ensuite utiliser `requestOtp` / `login`.
   */
  async enrollSms(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user.twoFactorEnabled || user.twoFactorMethod !== TwoFactorMethod.sms) {
      await this.twoFactorService.enableSms(user.id);
    }

    const sent = await this.twoFactorService.sendSmsCode(user.id);
    return {
      email: user.email,
      method: TwoFactorMethod.sms,
      expiresAt: sent.expiresAt,
      message: sent.message,
      ...('debugCode' in sent ? { debugCode: sent.debugCode } : {}),
    };
  }

  /**
   * Envoie un code SMS si le compte a la 2FA SMS activée.
   * Pour TOTP, le code est généré par l’app authenticator — rien à envoyer.
   */
  async requestOtp(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user.twoFactorEnabled || !user.twoFactorMethod) {
      throw new BadRequestException(
        '2FA is not enabled — call POST /auth/enroll/sms or set up TOTP first',
      );
    }

    if (user.twoFactorMethod === TwoFactorMethod.totp) {
      return {
        email: user.email,
        method: TwoFactorMethod.totp,
        message: 'Enter the TOTP code from your authenticator app',
      };
    }

    const sent = await this.twoFactorService.sendSmsCode(user.id);
    return {
      email: user.email,
      method: TwoFactorMethod.sms,
      expiresAt: sent.expiresAt,
      message: sent.message,
      ...('debugCode' in sent ? { debugCode: sent.debugCode } : {}),
    };
  }

  async login(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user.twoFactorEnabled || !user.twoFactorMethod) {
      throw new BadRequestException(
        '2FA is not enabled — set up TOTP or SMS before login',
      );
    }

    await this.twoFactorService.verify(user.id, code);
    return this.issueTokenPair(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    let payload: DoniJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<DoniJwtPayload>(
        refreshToken,
        { secret: this.refreshSecret() },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    return this.issueTokenPair(user.id, user.email);
  }

  private async issueTokenPair(userId: string, email: string) {
    const accessPayload: DoniJwtPayload = {
      sub: userId,
      email,
      typ: 'access',
    };
    const refreshPayload: DoniJwtPayload = {
      sub: userId,
      email,
      typ: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.accessSecret(),
        expiresIn: this.accessTtlSeconds(),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret(),
        expiresIn: this.refreshTtlSeconds(),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTtlSeconds(),
      user: { id: userId, email },
    };
  }

  private accessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret';
  }

  private refreshSecret(): string {
    return (
      this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret'
    );
  }

  /** Access TTL en secondes (défaut 15 min). */
  private accessTtlSeconds(): number {
    return this.parseTtlSeconds(
      this.config.get<string>('JWT_ACCESS_TTL'),
      15 * 60,
    );
  }

  /** Refresh TTL en secondes (défaut 7 jours). */
  private refreshTtlSeconds(): number {
    return this.parseTtlSeconds(
      this.config.get<string>('JWT_REFRESH_TTL'),
      7 * 24 * 60 * 60,
    );
  }

  private parseTtlSeconds(raw: string | undefined, fallback: number): number {
    if (!raw?.trim()) return fallback;
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
    const match = /^(\d+)([smhd])$/i.exec(raw.trim());
    if (!match) return fallback;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const mult =
      unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return value * mult;
  }
}
