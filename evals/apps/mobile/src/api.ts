import type { Line, Product } from './lib/pricing.ts';
import type { CheckoutForm } from './lib/validation.ts';

// 10.0.2.2 is the host machine as seen from the Android emulator. iOS simulators use localhost.
export const API_URL = 'http://10.0.2.2:3001';

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${API_URL}/api/products`);
  if (!response.ok) throw new Error('Could not load products');
  return response.json();
}

export async function placeOrder(customer: CheckoutForm, lines: Line[]): Promise<{ ok: boolean; orderNumber?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer,
        lines: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      }),
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, orderNumber: body.orderNumber };
  } catch {
    return { ok: false };
  }
}
