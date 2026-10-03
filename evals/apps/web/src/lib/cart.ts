import type { Line, Product } from './pricing.ts';

export type Cart = { lines: Line[]; count: number };

export const MAX_QUANTITY = 10;
export const emptyCart: Cart = { lines: [], count: 0 };

export function add(cart: Cart, product: Product): Cart {
  const line = cart.lines.find((candidate) => candidate.product.id === product.id);
  if (!line) return { lines: [...cart.lines, { product, quantity: 1 }], count: cart.count + 1 };
  if (line.quantity > MAX_QUANTITY) return cart;
  return {
    lines: cart.lines.map((candidate) =>
      candidate === line ? { ...candidate, quantity: candidate.quantity + 1 } : candidate,
    ),
    count: cart.count + 1,
  };
}

export function setQuantity(cart: Cart, productId: number, quantity: number): Cart {
  const clamped = Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(quantity) || 1));
  const lines = cart.lines.map((line) => (line.product.id === productId ? { ...line, quantity: clamped } : line));
  return { lines, count: lines.reduce((sum, line) => sum + line.quantity, 0) };
}

export function remove(cart: Cart, productId: number): Cart {
  return { lines: cart.lines.filter((line) => line.product.id !== productId), count: cart.count - 1 };
}
