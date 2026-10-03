/** In-memory API for the Alchemy Shop benchmark apps. It has no seeded defects: every seeded defect is in a client. */
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const PRODUCTS = [
  { id: 1, name: 'Copper Still', price: 24.5, onSale: false },
  { id: 2, name: 'Glass Retort', price: 12.99, onSale: true },
  { id: 3, name: 'Mortar and Pestle', price: 8.75, onSale: false },
  { id: 4, name: 'Brass Scale', price: 31.0, onSale: false },
  { id: 5, name: 'Sulphur Jar', price: 3.33, onSale: true },
  { id: 6, name: 'Philosopher Stone Replica', price: 49.99, onSale: false },
];
const DEMO = { email: 'demo@alchemy.test', password: 'alchemy', token: 'demo-token' };

function validOrder(order) {
  const customer = order?.customer ?? {};
  const lines = order?.lines;
  return (
    typeof customer.name === 'string' &&
    customer.name.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(customer.email ?? '') &&
    /^\d{5}$/.test(customer.postcode ?? '') &&
    Array.isArray(lines) &&
    lines.length > 0 &&
    lines.every(
      (line) =>
        PRODUCTS.some((product) => product.id === line.productId) &&
        Number.isInteger(line.quantity) &&
        line.quantity >= 1 &&
        line.quantity <= 10,
    )
  );
}

async function readJson(request) {
  let text = '';
  for await (const chunk of request) text += chunk;
  try {
    return JSON.parse(text || 'null');
  } catch {
    return null;
  }
}

/** A fresh API with its own order list, so tests do not share state. */
export function createApi() {
  const orders = [];

  return createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const send = (status, body) => {
      response.writeHead(status, {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type, authorization',
      });
      response.end(JSON.stringify(body));
    };
    const route = `${request.method} ${url.pathname}`;

    if (request.method === 'OPTIONS') return send(204, null);
    if (route === 'GET /api/products') return send(200, PRODUCTS);

    if (route === 'POST /api/login') {
      const body = await readJson(request);
      const ok = body?.email === DEMO.email && body?.password === DEMO.password;
      return ok ? send(200, { token: DEMO.token }) : send(401, { error: 'Wrong email or password' });
    }

    if (route === 'POST /api/orders') {
      // ?fail=1 lets a test drive the client's error path without stopping the server.
      if (url.searchParams.get('fail') === '1') return send(500, { error: 'Order service unavailable' });
      const order = await readJson(request);
      if (!validOrder(order)) return send(400, { error: 'Invalid order' });
      const orderNumber = `A-${String(1000 + orders.length + 1)}`;
      orders.push({ orderNumber, ...order });
      return send(201, { orderNumber });
    }

    if (route === 'GET /api/orders') {
      if (request.headers.authorization !== `Bearer ${DEMO.token}`) return send(401, { error: 'Sign in first' });
      return send(200, orders);
    }

    return send(404, { error: 'Not found' });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3001);
  createApi().listen(port, () => console.log(`Alchemy Shop API on http://localhost:${port}`));
}
