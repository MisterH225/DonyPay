import type { INestApplication } from '@nestjs/common';
import { UserType } from '@prisma/client';
import request from 'supertest';

export type E2eUserSession = {
  userId: string;
  email: string;
  phone: string;
  accessToken: string;
};

let userSeq = 0;

export async function createAuthenticatedUser(
  app: INestApplication,
  overrides?: Partial<{
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
  }>,
): Promise<E2eUserSession> {
  userSeq += 1;
  const email =
    overrides?.email ?? `e2e-user-${userSeq}-${Date.now()}@donypay.test`;
  const phone = overrides?.phone ?? `+22507${String(10000000 + userSeq)}`;

  const created = await request(app.getHttpServer())
    .post('/api/identity/users')
    .send({
      email,
      phone,
      type: UserType.individual,
      firstName: overrides?.firstName ?? 'E2E',
      lastName: overrides?.lastName ?? `User${userSeq}`,
    })
    .expect((res) => {
      if (![200, 201].includes(res.status)) {
        throw new Error(`create user failed: ${res.status} ${res.text}`);
      }
    });

  const enroll = await request(app.getHttpServer())
    .post('/api/auth/enroll/sms')
    .send({ email })
    .expect((res) => {
      if (![200, 201].includes(res.status)) {
        throw new Error(`enroll failed: ${res.status} ${res.text}`);
      }
    });

  const code = enroll.body.debugCode as string;
  expect(code).toBeTruthy();

  const login = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, code })
    .expect((res) => {
      if (![200, 201].includes(res.status)) {
        throw new Error(`login failed: ${res.status} ${res.text}`);
      }
    });

  return {
    userId: created.body.id as string,
    email,
    phone,
    accessToken: login.body.accessToken as string,
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
