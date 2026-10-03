import type { Line, Product } from './pricing.ts';

export type Cart = { lines: Line[] };

export const MAX_QUANTITY = 10;
export const emptyCart: Cart = { lines: [] };

export const cartCount = (cart: Cart): number => cart.lines.reduce((sum, line) => sum + line.quantity, 0);

const change = (cart: Cart, productId: number, by: number): Cart => ({
  lines: cart.lines.map((line) => (line.product.id === productId ? { ...line, quantity: line.quantity + by } : line)),
});

export function add(cart: Cart, product: Product): Cart {
  const line = cart.lines.find((candidate) => candidate.product.id === product.id);
  if (!line) return { lines: [...cart.lines, { product, quantity: 1 }] };
  return line.quantity >= MAX_QUANTITY ? cart : change(cart, product.id, 1);
}

export const decrement = (cart: Cart, productId: number): Cart => change(cart, productId, -1);

export const remove = (cart: Cart, productId: number): Cart => ({
  lines: cart.lines.filter((line) => line.product.id !== productId),
});
