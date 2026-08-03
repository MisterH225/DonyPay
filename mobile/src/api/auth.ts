import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCESS_TOKEN_KEY, apiRequest } from './client';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: { id: string; email: string };
};

export async function enrollSms(email: string) {
  return apiRequest<{
    email: string;
    method: string;
    expiresAt?: string;
    message: string;
    debugCode?: string;
  }>(
    '/auth/enroll/sms',
    { method: 'POST', body: JSON.stringify({ email }) },
    { skipAuth: true },
  );
}

export async function login(email: string, code: string) {
  const tokens = await apiRequest<AuthTokens>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, code }) },
    { skipAuth: true },
  );
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  await AsyncStorage.setItem('donypay.refreshToken', tokens.refreshToken);
  return tokens;
}

export async function clearAuthTokens() {
  await AsyncStorage.multiRemove([
    ACCESS_TOKEN_KEY,
    'donypay.refreshToken',
  ]);
}
