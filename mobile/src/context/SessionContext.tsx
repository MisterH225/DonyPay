import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAuthTokens, enrollSms, login } from '../api/auth';
import { ACCESS_TOKEN_KEY } from '../api/client';
import { createUser, getMe } from '../api/identity';
import type { User } from '../api/types';

const STORAGE_KEY = 'donypay.userId';
const EMAIL_KEY = 'donypay.email';

type SessionContextValue = {
  user: User | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

async function ensureUser(): Promise<User> {
  const existingToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (existingToken) {
    try {
      return await getMe();
    } catch {
      await clearAuthTokens();
    }
  }

  let email = await AsyncStorage.getItem(EMAIL_KEY);
  if (!email) {
    const stamp = Date.now();
    email = `acheteur.${stamp}@donypay.app`;
    const user = await createUser({
      email,
      phone: '+2250700000000',
      type: 'individual',
      firstName: 'Awa',
      lastName: 'Koné',
    });
    await AsyncStorage.setItem(STORAGE_KEY, user.id);
    await AsyncStorage.setItem(EMAIL_KEY, email);
  }

  const enrolled = await enrollSms(email);
  const code = enrolled.debugCode;
  if (!code) {
    throw new Error(
      'Code OTP indisponible (debugCode) — activez NODE_ENV≠production côté API',
    );
  }

  const tokens = await login(email, code);
  await AsyncStorage.setItem(STORAGE_KEY, tokens.user.id);
  return getMe();
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await ensureUser();
      setUser(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Session impossible');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      userId: user?.id ?? null,
      loading,
      error,
      refresh,
    }),
    [user, loading, error, refresh],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
