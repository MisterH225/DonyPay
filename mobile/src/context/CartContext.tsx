import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MockProduct, SavingsPlanOption, ProductVariant } from '../data/mockCatalog';

export type CartLine = {
  key: string;
  product: MockProduct;
  quantity: number;
  variant?: ProductVariant;
  plan: SavingsPlanOption;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (input: {
    product: MockProduct;
    variant?: ProductVariant;
    plan: SavingsPlanOption;
    quantity?: number;
  }) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function lineKey(
  productId: string,
  variantId: string | undefined,
  planId: string,
) {
  return `${productId}:${variantId ?? 'default'}:${planId}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce(
      (sum, line) => sum + line.product.price * line.quantity,
      0,
    );

    return {
      lines,
      itemCount,
      subtotal,
      addItem: ({ product, variant, plan, quantity = 1 }) => {
        const key = lineKey(product.id, variant?.id, plan.id);
        setLines((current) => {
          const existing = current.find((line) => line.key === key);
          if (existing) {
            return current.map((line) =>
              line.key === key
                ? { ...line, quantity: line.quantity + quantity }
                : line,
            );
          }
          return [
            ...current,
            { key, product, variant, plan, quantity },
          ];
        });
      },
      setQuantity: (key, quantity) => {
        setLines((current) =>
          current
            .map((line) =>
              line.key === key ? { ...line, quantity } : line,
            )
            .filter((line) => line.quantity > 0),
        );
      },
      removeItem: (key) => {
        setLines((current) => current.filter((line) => line.key !== key));
      },
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
