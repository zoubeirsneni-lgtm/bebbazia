"use client";

// Store panier BEBBA — persistance locale (politique d'abandon de panier CDC #83 :
// conservation côté client tant que la politique définitive n'est pas arrêtée).
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { cartItemSignature, computeTotals, type CartItem, type CartOption } from "@/lib/cart";

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "key">) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const key = cartItemSignature(item.productId, item.options);
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            // Deux ajouts identiques (même personnalisation) fusionnent leur quantité
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, key }] };
        }),
      updateQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        })),
      removeItem: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "bebba-cart-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Hook utilitaire : totaux calculés depuis les items (recalcul CDC #13)
export function useCartTotals() {
  const items = useCartStore((s) => s.items);
  return computeTotals(items);
}

export type { CartItem, CartOption };
