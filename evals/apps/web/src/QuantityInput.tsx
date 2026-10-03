import { MAX_QUANTITY } from './lib/cart.ts';

type Props = { productId: number; value: number; onChange: (quantity: number) => void };

export function QuantityInput({ productId, value, onChange }: Props) {
  return (
    <input
      type="number"
      data-testid={`quantity-${productId}`}
      min={1}
      max={MAX_QUANTITY}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
