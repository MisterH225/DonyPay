import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

/**
 * Protège `/api/admin/*` via header `X-Admin-Key` === `ADMIN_API_KEY`.
 * Inaccessible aux utilisateurs finaux (mobile / API publiques).
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_KEY?.trim();
    if (!expected) {
      throw new ServiceUnavailableException(
        'Admin console is not configured (ADMIN_API_KEY missing)',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided =
      request.header('x-admin-key')?.trim() ||
      request.header('authorization')?.replace(/^Bearer\s+/i, '').trim();

    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
