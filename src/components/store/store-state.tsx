"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Estado del carrito y de la lista de cotización en el navegador.
// Solo guarda identificadores, cantidades y una vista previa para mostrar;
// los precios y la disponibilidad SIEMPRE se recalculan en el servidor.

export interface LineSnapshot {
  name: string;
  sku: string;
  slug: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
  snapshot: LineSnapshot;
}

export interface QuoteLine extends CartLine {
  notes: string;
}

interface StoreState {
  ready: boolean;
  cart: CartLine[];
  quote: QuoteLine[];
  addToCart(productId: string, quantity: number, snapshot: LineSnapshot): void;
  setCartQuantity(productId: string, quantity: number): void;
  removeFromCart(productId: string): void;
  clearCart(): void;
  addToQuote(productId: string, quantity: number, snapshot: LineSnapshot): void;
  setQuoteQuantity(productId: string, quantity: number): void;
  setQuoteNotes(productId: string, notes: string): void;
  removeFromQuote(productId: string): void;
  clearQuote(): void;
  toast: { id: number; message: string; href?: string; hrefLabel?: string } | null;
  notify(message: string, href?: string, hrefLabel?: string): void;
}

const Ctx = createContext<StoreState | null>(null);
const CART_KEY = "icon.cart.v1";
const QUOTE_KEY = "icon.quote.v1";
const MAX_QTY = 9999;

function read<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clamp(q: number) {
  if (!Number.isFinite(q)) return 1;
  return Math.max(1, Math.min(MAX_QTY, Math.floor(q)));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [quote, setQuote] = useState<QuoteLine[]>([]);
  const [toast, setToast] = useState<StoreState["toast"]>(null);

  useEffect(() => {
    setCart(read<CartLine>(CART_KEY));
    setQuote(read<QuoteLine>(QUOTE_KEY));
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setCart(read<CartLine>(CART_KEY));
      if (e.key === QUOTE_KEY) setQuote(read<QuoteLine>(QUOTE_KEY));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [cart, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(QUOTE_KEY, JSON.stringify(quote));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [quote, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((message: string, href?: string, hrefLabel?: string) => {
    setToast({ id: Date.now(), message, href, hrefLabel });
  }, []);

  const value = useMemo<StoreState>(
    () => ({
      ready,
      cart,
      quote,
      toast,
      notify,
      addToCart(productId, quantity, snapshot) {
        setCart((c) => {
          const found = c.find((l) => l.productId === productId);
          if (found) return c.map((l) => (l.productId === productId ? { ...l, quantity: clamp(l.quantity + quantity), snapshot } : l));
          return [...c, { productId, quantity: clamp(quantity), snapshot }];
        });
      },
      setCartQuantity(productId, quantity) {
        setCart((c) => c.map((l) => (l.productId === productId ? { ...l, quantity: clamp(quantity) } : l)));
      },
      removeFromCart(productId) {
        setCart((c) => c.filter((l) => l.productId !== productId));
      },
      clearCart() {
        setCart([]);
      },
      addToQuote(productId, quantity, snapshot) {
        setQuote((c) => {
          const found = c.find((l) => l.productId === productId);
          if (found) return c.map((l) => (l.productId === productId ? { ...l, quantity: clamp(l.quantity + quantity), snapshot } : l));
          return [...c, { productId, quantity: clamp(quantity), snapshot, notes: "" }];
        });
      },
      setQuoteQuantity(productId, quantity) {
        setQuote((c) => c.map((l) => (l.productId === productId ? { ...l, quantity: clamp(quantity) } : l)));
      },
      setQuoteNotes(productId, notes) {
        setQuote((c) => c.map((l) => (l.productId === productId ? { ...l, notes: notes.slice(0, 500) } : l)));
      },
      removeFromQuote(productId) {
        setQuote((c) => c.filter((l) => l.productId !== productId));
      },
      clearQuote() {
        setQuote([]);
      },
    }),
    [ready, cart, quote, toast, notify],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
