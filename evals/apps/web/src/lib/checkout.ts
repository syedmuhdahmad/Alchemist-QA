export type CheckoutState = {
  status: 'idle' | 'submitting' | 'placed' | 'failed';
  orderNumber?: string;
};

export type OrderResponse = { ok: boolean; orderNumber?: string };

export const canSubmit = (state: CheckoutState): boolean => state.status !== 'placed';

export function outcome(response: OrderResponse): CheckoutState {
  return { status: 'placed', orderNumber: response.orderNumber ?? 'pending' };
}
