import { NextResponse, type NextRequest } from 'next/server';
import { verifySignedToken } from '@/lib/crypto-token';

const SESSION_COOKIE = 'donypay_admin_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    'dev-only-insecure-secret';
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verifySignedToken(token, secret))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
