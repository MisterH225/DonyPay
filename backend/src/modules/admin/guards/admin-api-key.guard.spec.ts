import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminApiKeyGuard } from './admin-api-key.guard';

describe('AdminApiKeyGuard', () => {
  const guard = new AdminApiKeyGuard();

  function ctx(headers: Record<string, string | undefined>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) => headers[name.toLowerCase()],
        }),
      }),
    } as never;
  }

  const prev = process.env.ADMIN_API_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = prev;
  });

  it('rejects when ADMIN_API_KEY is missing', () => {
    delete process.env.ADMIN_API_KEY;
    expect(() => guard.canActivate(ctx({}))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects invalid key', () => {
    process.env.ADMIN_API_KEY = 'secret';
    expect(() => guard.canActivate(ctx({ 'x-admin-key': 'wrong' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts valid X-Admin-Key', () => {
    process.env.ADMIN_API_KEY = 'secret';
    expect(guard.canActivate(ctx({ 'x-admin-key': 'secret' }))).toBe(true);
  });
});
