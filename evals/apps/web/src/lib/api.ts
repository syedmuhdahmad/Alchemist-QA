import type { Line, Product } from './pricing.ts';
import type { CheckoutForm } from './validation.ts';
import type { OrderResponse } from './checkout.ts';

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error('Could not load products');
  return response.json();
}

export async function placeOrder(customer: CheckoutForm, lines: Line[]): Promise<OrderResponse> {
  // ?fail=1 on the page URL is passed through so a tester can drive the error path.
  const fail = new URLSearchParams(window.location.search).get('fail') === '1' ? '?fail=1' : '';
  try {
    const response = await fetch(`/api/orders${fail}`, {
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

export async function signIn(email: string, password: string): Promise<string | null> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.ok ? (await response.json()).token : null;
}

export async function fetchOrders(token: string): Promise<{ orderNumber: string }[]> {
  const response = await fetch('/api/orders', { headers: { authorization: `Bearer ${token}` } });
  return response.ok ? response.json() : [];
}
