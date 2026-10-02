import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  addToCart as apiAddToCart,
  checkoutCart as apiCheckout,
  clearCart as apiClearCart,
  fetchCart,
  removeCartItem as apiRemoveCartItem,
  updateCartItem as apiUpdateCartItem,
} from "@/src/api";
import type { Cart } from "@/src/api/types";
import { useApp } from "@/src/context/AppContext";

type CartContextValue = {
  cart: Cart;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addToCart: (args: { productId?: string; slug?: string; quantity?: number }) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  checkout: () => Promise<{ id?: string; orderId?: string } | null>;
};

const EMPTY: Cart = { items: [], subtotal: 0, total: 0, itemCount: 0 };
const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const [cart, setCart] = useState<Cart>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(EMPTY);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setCart(await fetchCart());
    } catch (e: any) {
      setError(e?.message ?? "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToCart = useCallback(
    async (args: { productId?: string; slug?: string; quantity?: number }) => {
      const quantity = args.quantity ?? 1;
      setError(null);
      const next = await apiAddToCart({ ...args, quantity });
      setCart(next);
    },
    [],
  );

  const updateItem = useCallback(async (productId: string, quantity: number) => {
    setError(null);
    const next = await apiUpdateCartItem({ productId, quantity });
    setCart(next);
  }, []);

  const removeItem = useCallback(async (productId: string) => {
    setError(null);
    const next = await apiRemoveCartItem({ productId });
    setCart(next);
  }, []);

  const clear = useCallback(async () => {
    setError(null);
    setCart(await apiClearCart());
  }, []);

  const checkout = useCallback(async () => {
    setError(null);
    const result = await apiCheckout();
    await refresh();
    return result ?? null;
  }, [refresh]);

  const value = useMemo(
    () => ({
      cart,
      loading,
      error,
      refresh,
      addToCart,
      updateItem,
      removeItem,
      clear,
      checkout,
    }),
    [cart, loading, error, refresh, addToCart, updateItem, removeItem, clear, checkout],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}