import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUser, getUser } from '../api/identity';
import type { User } from '../api/types';

const STORAGE_KEY = 'donypay.userId';

type SessionContextValue = {
  user: User | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

async function ensureUser(): Promise<User> {
  const existingId = await AsyncStorage.getItem(STORAGE_KEY);
  if (existingId) {
    try {
      return await getUser(existingId);
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }

  const stamp = Date.now();
  const user = await createUser({
    email: `acheteur.${stamp}@donypay.app`,
    phone: '+2250700000000',
    type: 'individual',
    firstName: 'Awa',
    lastName: 'Koné',
  });
  await AsyncStorage.setItem(STORAGE_KEY, user.id);
  return user;
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
