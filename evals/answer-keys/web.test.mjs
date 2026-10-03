/**
 * Proves each seeded defect in the web benchmark app is present.
 * Every test asserts the DEFECTIVE behaviour, so this suite passes while the benchmark is intact
 * and fails if someone fixes a defect by accident. See web.yaml for the requirement each one breaks.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { add, emptyCart, remove } from '../apps/web/src/lib/cart.ts';
import { totals } from '../apps/web/src/lib/pricing.ts';
import { isEmail } from '../apps/web/src/lib/validation.ts';
import { canSubmit, outcome } from '../apps/web/src/lib/checkout.ts';
import { canView } from '../apps/web/src/lib/session.ts';

const still = { id: 1, name: 'Copper Still', price: 24.5, onSale: false };
const retort = { id: 2, name: 'Glass Retort', price: 12.99, onSale: true };
const jar = { id: 5, name: 'Sulphur Jar', price: 3.33, onSale: true };
const scale = { id: 4, name: 'Brass Scale', price: 31.0, onSale: false };
const times = (n, product, cart = emptyCart) => Array.from({ length: n }).reduce((state) => add(state, product), cart);

test('W1 CART-2: an eleventh unit can be added to a line', () => {
  assert.equal(times(11, still).lines[0].quantity, 11);
});

test('W2 PRICE-4: a subtotal of exactly 50.00 is still charged shipping', () => {
  const lines = [{ product: { ...still, price: 25 }, quantity: 2 }];
  assert.equal(totals(lines, '').shipping, 4.99);
});

test('W3 PRICE-2: SAVE10 also discounts a product that is on sale', () => {
  assert.equal(totals([{ product: retort, quantity: 1 }], 'SAVE10').discount, 1.29);
});

test('W4 PRICE-6: tax of 0.2664 is shown as 0.26, not 0.27', () => {
  assert.equal(totals([{ product: jar, quantity: 1 }], '').tax, 0.26);
});

test('W5 CHK-2: an email address with no top-level domain is accepted', () => {
  assert.equal(isEmail('ada@example'), true);
});

test('W6 CART-3: removing a line of two leaves the cart count at 1', () => {
  const cart = remove(times(2, still), still.id);
  assert.deepEqual([cart.lines.length, cart.count], [0, 1]);
});

test('W7 CHK-4: the order can be submitted again while it is being sent', () => {
  assert.equal(canSubmit({ status: 'submitting' }), true);
});

test('W8 A11Y-1: the quantity input has no accessible name', () => {
  const source = readFileSync(new URL('../apps/web/src/QuantityInput.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /aria-label|<label|aria-labelledby/);
});

test('W9 CHK-6: a rejected order is reported as placed', () => {
  assert.equal(outcome({ ok: false }).status, 'placed');
});

test('W10 ACC-1: a signed-out shopper may view order history', () => {
  assert.equal(canView('orders', null), true);
});

test('control: behaviour next to each defect is correct, so the defects are isolated', () => {
  assert.equal(times(10, still).lines[0].quantity, 10);
  assert.equal(totals([{ product: scale, quantity: 2 }], '').shipping, 0);
  assert.equal(totals([{ product: still, quantity: 1 }], 'save10').discount, 2.45);
  assert.equal(isEmail('ada@example.com'), true);
  assert.equal(isEmail('ada example.com'), false);
  assert.equal(canSubmit({ status: 'placed' }), false);
  assert.equal(outcome({ ok: true, orderNumber: 'A-1001' }).orderNumber, 'A-1001');
  assert.equal(canView('orders', { token: 't' }), true);
  assert.equal(canView('cart', null), true);
});
