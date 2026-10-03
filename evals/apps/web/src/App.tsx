import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { fetchOrders, fetchProducts, placeOrder, signIn } from './lib/api.ts';
import { add, emptyCart, remove, setQuantity } from './lib/cart.ts';
import type { Cart } from './lib/cart.ts';
import { canSubmit, outcome } from './lib/checkout.ts';
import type { CheckoutState } from './lib/checkout.ts';
import { formatMoney, isKnownCode, lineTotal, totals } from './lib/pricing.ts';
import type { Product } from './lib/pricing.ts';
import { canView } from './lib/session.ts';
import type { Page, Session } from './lib/session.ts';
import { validateCheckout } from './lib/validation.ts';
import type { CheckoutForm, FormErrors } from './lib/validation.ts';
import { QuantityInput } from './QuantityInput.tsx';

const PAGES: Page[] = ['products', 'cart', 'checkout', 'orders', 'signin'];

function pageFromHash(): Page {
  const name = window.location.hash.replace('#/', '') as Page;
  return PAGES.includes(name) ? name : 'products';
}

export function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [session, setSession] = useState<Session>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const shown: Page = canView(page, session) ? page : 'signin';

  return (
    <>
      <header>
        <h1>Alchemy Shop</h1>
        <nav aria-label="Main">
          <a href="#/products">Products</a> <a href="#/cart">Cart (<span data-testid="cart-count">{cart.count}</span>)</a>{' '}
          <a href="#/orders">Orders</a> <a href="#/signin">{session ? 'Signed in' : 'Sign in'}</a>
        </nav>
      </header>
      <main>
        {shown === 'products' && <Products onAdd={(product) => setCart((current) => add(current, product))} />}
        {shown === 'cart' && <CartPage cart={cart} setCart={setCart} code={code} setCode={setCode} />}
        {shown === 'checkout' && <Checkout cart={cart} code={code} onPlaced={() => setCart(emptyCart)} />}
        {shown === 'orders' && <Orders session={session} />}
        {shown === 'signin' && <SignIn onSignedIn={setSession} />}
      </main>
    </>
  );
}

function Products({ onAdd }: { onAdd: (product: Product) => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    fetchProducts().then(setProducts, () => setFailed(true));
  };
  useEffect(load, []);

  if (failed) {
    return (
      <p role="alert">
        Could not load products <button onClick={load}>Try again</button>
      </p>
    );
  }
  if (!products) return <p>Loading products</p>;
  return (
    <ul aria-label="Products">
      {products.map((product) => (
        <li key={product.id} data-testid={`product-${product.id}`}>
          {product.name} {formatMoney(product.price)} {product.onSale && <strong>Sale</strong>}{' '}
          <button onClick={() => onAdd(product)}>Add {product.name} to cart</button>
        </li>
      ))}
    </ul>
  );
}

type CartProps = { cart: Cart; setCart: (update: (cart: Cart) => Cart) => void; code: string; setCode: (code: string) => void };

function CartPage({ cart, setCart, code, setCode }: CartProps) {
  const [entered, setEntered] = useState(code);
  const [codeError, setCodeError] = useState('');
  const sums = totals(cart.lines, code);

  const applyCode = (event: FormEvent) => {
    event.preventDefault();
    const known = isKnownCode(entered);
    setCodeError(known ? '' : 'This code is not valid');
    setCode(known ? entered : '');
  };

  if (cart.lines.length === 0) return <p>Your cart is empty</p>;
  return (
    <>
      <table>
        <tbody>
          {cart.lines.map((line) => (
            <tr key={line.product.id} data-testid={`line-${line.product.id}`}>
              <td>{line.product.name}</td>
              <td>
                <QuantityInput
                  productId={line.product.id}
                  value={line.quantity}
                  onChange={(quantity) => setCart((current) => setQuantity(current, line.product.id, quantity))}
                />
              </td>
              <td data-testid={`line-total-${line.product.id}`}>{formatMoney(lineTotal(line))}</td>
              <td>
                <button onClick={() => setCart((current) => remove(current, line.product.id))}>
                  Remove {line.product.name}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={applyCode}>
        <label>
          Promo code <input value={entered} onChange={(event) => setEntered(event.target.value)} />
        </label>{' '}
        <button type="submit">Apply</button> {codeError && <span role="alert">{codeError}</span>}
      </form>
      <dl>
        <dt>Subtotal</dt>
        <dd data-testid="subtotal">{formatMoney(sums.subtotal)}</dd>
        <dt>Discount</dt>
        <dd data-testid="discount">{formatMoney(sums.discount)}</dd>
        <dt>Shipping</dt>
        <dd data-testid="shipping">{formatMoney(sums.shipping)}</dd>
        <dt>Tax</dt>
        <dd data-testid="tax">{formatMoney(sums.tax)}</dd>
        <dt>Total</dt>
        <dd data-testid="total">{formatMoney(sums.total)}</dd>
      </dl>
      <a href="#/checkout">Go to checkout</a>
    </>
  );
}

function Checkout({ cart, code, onPlaced }: { cart: Cart; code: string; onPlaced: () => void }) {
  const [form, setForm] = useState<CheckoutForm>({ name: '', email: '', postcode: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<CheckoutState>({ status: 'idle' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateCheckout(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setState({ status: 'submitting' });
    const result = outcome(await placeOrder(form, cart.lines));
    setState(result);
    if (result.status === 'placed') onPlaced();
  };

  if (state.status === 'placed') return <p role="status">Order placed: {state.orderNumber}</p>;
  if (cart.lines.length === 0) return <p>Your cart is empty</p>;

  const field = (name: keyof CheckoutForm, label: string) => (
    <p>
      <label>
        {label}{' '}
        <input value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} />
      </label>{' '}
      {errors[name] && <span role="alert">{errors[name]}</span>}
    </p>
  );

  return (
    <form onSubmit={submit} noValidate>
      {field('name', 'Name')}
      {field('email', 'Email')}
      {field('postcode', 'Postcode')}
      <p>Total to pay: {formatMoney(totals(cart.lines, code).total)}</p>
      {state.status === 'failed' && <p role="alert">We could not place your order</p>}
      <button type="submit" disabled={!canSubmit(state)}>
        Place order
      </button>
    </form>
  );
}

function Orders({ session }: { session: Session }) {
  const [orders, setOrders] = useState<{ orderNumber: string }[]>([]);
  useEffect(() => {
    fetchOrders(session?.token ?? '').then(setOrders);
  }, [session]);

  return (
    <>
      <h2>Order history</h2>
      {orders.length === 0 ? (
        <p>No orders yet</p>
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order.orderNumber}>{order.orderNumber}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const token = await signIn(email, password);
    setError(token ? '' : 'Wrong email or password');
    if (token) {
      onSignedIn({ token });
      window.location.hash = '#/orders';
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Sign in</h2>
      <p>
        <label>
          Email <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
      </p>
      <p>
        <label>
          Password <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
      </p>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  );
}
