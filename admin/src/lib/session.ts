import { cookies } from 'next/headers';
import { getSessionSecret } from './config';
import { signPayload, verifySignedToken } from './crypto-token';

export const SESSION_COOKIE = 'donypay_admin_session';

export async function createSessionToken(): Promise<string> {
  const payload = `admin:${Date.now()}`;
  const signature = await signPayload(payload, getSessionSecret());
  return `${payload}.${signature}`;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return verifySignedToken(jar.get(SESSION_COOKIE)?.value, getSessionSecret());
}
