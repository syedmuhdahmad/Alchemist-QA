import type { Cart } from './cart.ts';

export type AppStateName = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

/** The cart to use after the app moves between foreground and background. */
export function cartAfterAppState(cart: Cart, next: AppStateName): Cart {
  return next === 'active' ? { lines: [] } : cart;
}
