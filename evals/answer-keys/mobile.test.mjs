/**
 * Proves each seeded defect in the mobile benchmark app is present.
 * Every test asserts the DEFECTIVE behaviour. See mobile.yaml for the requirement each one breaks.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { add, decrement, emptyCart } from '../apps/mobile/src/lib/cart.ts';
import { isKnownCode, totals } from '../apps/mobile/src/lib/pricing.ts';
import { isPostcode } from '../apps/mobile/src/lib/validation.ts';
import { columnsFor, productAt, productsView } from '../apps/mobile/src/lib/catalogue.ts';
import { cartAfterAppState } from '../apps/mobile/src/lib/lifecycle.ts';
import { routeForLink } from '../apps/mobile/src/lib/links.ts';

const still = { id: 1, name: 'Copper Still', price: 24.5, onSale: false };
const products = [1, 2, 3, 4].map((id) => ({ ...still, id }));
const source = (path) => readFileSync(new URL(`../apps/mobile/src/${path}`, import.meta.url), 'utf8');

test('M1 CART-2: the quantity can be taken below 1', () => {
  const cart = decrement(decrement(add(emptyCart, still), still.id), still.id);
  assert.equal(cart.lines[0].quantity, -1);
});

test('M2 PRICE-3: a promo code in lower case is refused', () => {
  assert.equal(isKnownCode('save10'), false);
});

test('M3 PRICE-5: tax is worked out before the discount', () => {
  // 24.50 with SAVE10: tax should be 8% of 22.05 = 1.76, not 8% of 24.50 = 1.96.
  assert.equal(totals([{ product: still, quantity: 1 }], 'SAVE10').tax, 1.96);
});

test('M4 CHK-7: the checkout form is rebuilt when the device rotates', () => {
  assert.match(source('CheckoutScreen.tsx'), /key=\{orientation\}/);
});

test('M5 CAT-3: a failed product load shows a spinner and no message', () => {
  assert.deepEqual(productsView({ status: 'failed' }), { spinner: true, error: null, retry: false });
});

test('M6 CART-4: the cart is emptied when the app returns from the background', () => {
  assert.deepEqual(cartAfterAppState(add(emptyCart, still), 'active'), emptyCart);
});

test('M7 MOB-1: a product link opens the product list', () => {
  assert.deepEqual(routeForLink('alchemyshop://product/3'), { screen: 'products' });
});

test('M8 A11Y-1: the add-to-cart button has no accessible name', () => {
  // The opening tag of the Pressable whose testID starts with "add-".
  const button = source('ProductRow.tsx')
    .split('<Pressable')
    .map((chunk) => chunk.slice(0, chunk.indexOf('>')))
    .find((tag) => tag.includes('testID={`add-'));
  assert.ok(button, 'add button not found');
  assert.doesNotMatch(button, /accessibilityLabel/);
});

test('M9 CHK-3: a postcode of five letters is accepted', () => {
  assert.equal(isPostcode('abcde'), true);
});

test('M10 MOB-2: on a tablet, the first product of the second row opens the wrong product', () => {
  assert.equal(columnsFor(800), 2);
  assert.equal(productAt(products, 1, 0, 2).id, 2);
});

test('control: behaviour next to each defect is correct, so the defects are isolated', () => {
  assert.equal(Array.from({ length: 12 }).reduce((cart) => add(cart, still), emptyCart).lines[0].quantity, 10);
  assert.equal(isKnownCode('SAVE10'), true);
  assert.equal(totals([{ product: { ...still, price: 25 }, quantity: 2 }], '').shipping, 0);
  assert.equal(totals([{ product: { ...still, price: 3.33 }, quantity: 1 }], '').tax, 0.27);
  assert.equal(isPostcode('1234'), false);
  assert.deepEqual(productsView({ status: 'loading' }), { spinner: true, error: null, retry: false });
  assert.equal(productAt(products, 2, 0, 1).id, 3);
  assert.equal(columnsFor(400), 1);
  assert.deepEqual(routeForLink('https://example.com'), { screen: 'products' });
});
