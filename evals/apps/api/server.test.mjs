import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from './server.mjs';

let server;
let base;
before(async () => {
  server = createApi();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const ORDER = {
  customer: { name: 'Ada', email: 'ada@example.com', postcode: '12345' },
  lines: [{ productId: 1, quantity: 2 }],
};

test('GET /api/products lists the catalogue with sale flags', async () => {
  const products = await (await fetch(`${base}/api/products`)).json();
  assert.equal(products.length, 6);
  assert.deepEqual(Object.keys(products[0]).sort(), ['id', 'name', 'onSale', 'price']);
  assert.ok(products.some((product) => product.onSale));
});

test('POST /api/login accepts the demo account', async () => {
  const response = await post('/api/login', { email: 'demo@alchemy.test', password: 'alchemy' });
  assert.equal(response.status, 200);
  assert.ok((await response.json()).token);
});

test('POST /api/login rejects a wrong password', async () => {
  const response = await post('/api/login', { email: 'demo@alchemy.test', password: 'nope' });
  assert.equal(response.status, 401);
});

test('POST /api/orders stores a valid order and returns its number', async () => {
  const response = await post('/api/orders', ORDER);
  assert.equal(response.status, 201);
  assert.match((await response.json()).orderNumber, /^A-\d{4}$/);
});

test('POST /api/orders rejects a quantity above 10', async () => {
  const response = await post('/api/orders', { ...ORDER, lines: [{ productId: 1, quantity: 11 }] });
  assert.equal(response.status, 400);
});

test('POST /api/orders rejects an order with no lines', async () => {
  assert.equal((await post('/api/orders', { ...ORDER, lines: [] })).status, 400);
});

test('GET /api/orders needs a token', async () => {
  assert.equal((await fetch(`${base}/api/orders`)).status, 401);
});

test('GET /api/orders returns placed orders to a signed-in shopper', async () => {
  const { token } = await (await post('/api/login', { email: 'demo@alchemy.test', password: 'alchemy' })).json();
  await post('/api/orders', ORDER);
  const response = await fetch(`${base}/api/orders`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  assert.ok((await response.json()).length >= 1);
});

test('the fail switch makes order placement return 500, for error-path tests', async () => {
  const response = await post('/api/orders?fail=1', ORDER);
  assert.equal(response.status, 500);
});

test('an unknown path returns 404', async () => {
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
});
