export type Product = { id: number; name: string; price: number; onSale: boolean };
export type Line = { product: Product; quantity: number };
export type Totals = { subtotal: number; discount: number; shipping: number; tax: number; total: number };

const SHIPPING = 4.99;
const FREE_SHIPPING_FROM = 50;
const TAX_RATE = 0.08;

export const roundMoney = (amount: number): number => Math.floor(amount * 100) / 100;

export const formatMoney = (amount: number): string => amount.toFixed(2);

export const lineTotal = (line: Line): number => roundMoney(line.product.price * line.quantity);

export const isKnownCode = (code: string): boolean => code.trim().toUpperCase() === 'SAVE10';

export function totals(lines: Line[], code: string): Totals {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + lineTotal(line), 0));
  const discount = isKnownCode(code) ? roundMoney(subtotal * 0.1) : 0;
  const afterDiscount = roundMoney(subtotal - discount);
  const shipping = lines.length === 0 || afterDiscount > FREE_SHIPPING_FROM ? 0 : SHIPPING;
  const tax = roundMoney(afterDiscount * TAX_RATE);
  return { subtotal, discount, shipping, tax, total: roundMoney(afterDiscount + shipping + tax) };
}
