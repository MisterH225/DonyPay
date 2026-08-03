import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError } from '../api/client';
import { createShop, getShopBySeller } from '../api/catalog';
import type { Shop } from '../api/types';
import { useSession } from './SessionContext';

type ShopContextValue = {
  shop: Shop | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<Shop | null>;
  ensureShop: (input: {
    name: string;
    description?: string;
  }) => Promise<Shop>;
};

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useSession();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setShop(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await getShopBySeller(userId);
      setShop(next);
      return next;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setShop(null);
        return null;
      }
      setError(err instanceof Error ? err.message : 'Boutique indisponible');
      setShop(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ensureShop = useCallback(
    async (input: { name: string; description?: string }) => {
      if (!userId) throw new Error('Session vendeur indisponible');
      if (shop) return shop;
      const created = await createShop({
        name: input.name,
        description: input.description,
      });
      setShop(created);
      return created;
    },
    [shop, userId],
  );

  const value = useMemo(
    () => ({ shop, loading, error, refresh, ensureShop }),
    [shop, loading, error, refresh, ensureShop],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}
