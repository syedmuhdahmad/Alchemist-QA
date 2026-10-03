import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { fetchProducts } from './src/api.ts';
import { CartScreen } from './src/CartScreen.tsx';
import { CheckoutScreen } from './src/CheckoutScreen.tsx';
import { add, cartCount, emptyCart } from './src/lib/cart.ts';
import type { Cart } from './src/lib/cart.ts';
import { columnsFor, productAt, productsView, rows } from './src/lib/catalogue.ts';
import type { LoadState } from './src/lib/catalogue.ts';
import { cartAfterAppState } from './src/lib/lifecycle.ts';
import { routeForLink } from './src/lib/links.ts';
import { formatMoney } from './src/lib/pricing.ts';
import { ProductRow } from './src/ProductRow.tsx';

type Screen = { name: 'products' | 'cart' | 'checkout' } | { name: 'product'; productId: number };

function App() {
  const { width } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>({ name: 'products' });
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [code, setCode] = useState('');

  const loadProducts = () => {
    setLoad({ status: 'loading' });
    fetchProducts().then(
      (products) => setLoad({ status: 'ready', products }),
      () => setLoad({ status: 'failed' }),
    );
  };
  useEffect(loadProducts, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setCart((current) => cartAfterAppState(current, next)),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const open = (url?: string | null) => {
      if (!url) return;
      const route = routeForLink(url);
      setScreen(route.screen === 'product' ? { name: 'product', productId: route.productId } : { name: 'products' });
    };
    Linking.getInitialURL().then(open);
    const subscription = Linking.addEventListener('url', (event) => open(event.url));
    return () => subscription.remove();
  }, []);

  const view = productsView(load);
  const products = load.status === 'ready' ? load.products : [];
  const columns = columnsFor(width);
  const opened = screen.name === 'product' ? products.find((product) => product.id === screen.productId) : undefined;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.app}>
        <View style={styles.header}>
          <Pressable testID="nav-products" accessibilityRole="button" onPress={() => setScreen({ name: 'products' })}>
            <Text style={styles.title}>Alchemy Shop</Text>
          </Pressable>
          <Pressable testID="nav-cart" accessibilityRole="button" onPress={() => setScreen({ name: 'cart' })}>
            <Text testID="cart-count">Cart ({cartCount(cart)})</Text>
          </Pressable>
        </View>
        <ScrollView>
          {screen.name === 'products' && (
            <View testID="products">
              {view.spinner ? <ActivityIndicator testID="products-loading" /> : null}
              {view.error ? <Text testID="products-error">{view.error}</Text> : null}
              {view.retry ? (
                <Pressable testID="products-retry" accessibilityRole="button" onPress={loadProducts}>
                  <Text>Try again</Text>
                </Pressable>
              ) : null}
              {rows(products, columns).map((row, rowIndex) => (
                <View key={row[0].id} style={styles.row}>
                  {row.map((product, columnIndex) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onAdd={() => setCart((current) => add(current, product))}
                      onOpen={() =>
                        setScreen({ name: 'product', productId: productAt(products, rowIndex, columnIndex, columns).id })
                      }
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
          {screen.name === 'product' && opened ? (
            <View style={styles.detail} testID="product-detail">
              <Text style={styles.title} testID="product-name">
                {opened.name}
              </Text>
              <Text>{formatMoney(opened.price)}</Text>
              <Pressable
                style={styles.button}
                testID="detail-add"
                accessibilityRole="button"
                accessibilityLabel={`Add ${opened.name} to cart`}
                onPress={() => setCart((current) => add(current, opened))}>
                <Text style={styles.buttonText}>Add to cart</Text>
              </Pressable>
            </View>
          ) : null}
          {screen.name === 'cart' && (
            <CartScreen
              cart={cart}
              setCart={setCart}
              code={code}
              setCode={setCode}
              onCheckout={() => setScreen({ name: 'checkout' })}
            />
          )}
          {screen.name === 'checkout' && <CheckoutScreen cart={cart} code={code} onPlaced={() => setCart(emptyCart)} />}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#ddd' },
  title: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row' },
  detail: { padding: 16, gap: 8 },
  button: { backgroundColor: '#225', padding: 12, borderRadius: 4, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default App;
