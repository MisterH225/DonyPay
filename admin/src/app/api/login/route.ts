import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminPassword } from '@/lib/config';
import { SESSION_COOKIE, createSessionToken } from '@/lib/session';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password?.trim() ?? '';
    const expected = getAdminPassword();

    if (!password || !safeEqual(password, expected)) {
      return NextResponse.json(
        { message: 'Mot de passe invalide' },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      {
        message:
          err instanceof Error ? err.message : 'Configuration admin invalide',
      },
      { status: 500 },
    );
  }
}
