import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { add, decrement, remove } from './lib/cart.ts';
import type { Cart } from './lib/cart.ts';
import { formatMoney, isKnownCode, lineTotal, totals } from './lib/pricing.ts';

type Props = {
  cart: Cart;
  setCart: (update: (cart: Cart) => Cart) => void;
  code: string;
  setCode: (code: string) => void;
  onCheckout: () => void;
};

export function CartScreen({ cart, setCart, code, setCode, onCheckout }: Props) {
  const [entered, setEntered] = useState(code);
  const [codeError, setCodeError] = useState('');
  const sums = totals(cart.lines, code);

  const applyCode = () => {
    const known = isKnownCode(entered);
    setCodeError(known ? '' : 'This code is not valid');
    setCode(known ? entered : '');
  };

  if (cart.lines.length === 0) return <Text testID="cart-empty">Your cart is empty</Text>;

  const button = (testID: string, label: string, text: string, onPress: () => void) => (
    <Pressable style={styles.small} testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <Text>{text}</Text>
    </Pressable>
  );
  const amount = (testID: string, label: string, value: number) => (
    <Text testID={testID}>
      {label}: {formatMoney(value)}
    </Text>
  );

  return (
    <View style={styles.screen}>
      {cart.lines.map((line) => (
        <View key={line.product.id} style={styles.line}>
          <Text style={styles.name}>{line.product.name}</Text>
          {button(`decrease-${line.product.id}`, `Decrease ${line.product.name}`, '-', () =>
            setCart((current) => decrement(current, line.product.id)),
          )}
          <Text testID={`quantity-${line.product.id}`}>{line.quantity}</Text>
          {button(`increase-${line.product.id}`, `Increase ${line.product.name}`, '+', () =>
            setCart((current) => add(current, line.product)),
          )}
          <Text testID={`line-total-${line.product.id}`}>{formatMoney(lineTotal(line))}</Text>
          {button(`remove-${line.product.id}`, `Remove ${line.product.name}`, 'Remove', () =>
            setCart((current) => remove(current, line.product.id)),
          )}
        </View>
      ))}
      <TextInput
        style={styles.input}
        testID="promo-code"
        accessibilityLabel="Promo code"
        autoCapitalize="none"
        value={entered}
        onChangeText={setEntered}
      />
      {button('apply-code', 'Apply promo code', 'Apply', applyCode)}
      {codeError ? <Text testID="code-error">{codeError}</Text> : null}
      {amount('subtotal', 'Subtotal', sums.subtotal)}
      {amount('discount', 'Discount', sums.discount)}
      {amount('shipping', 'Shipping', sums.shipping)}
      {amount('tax', 'Tax', sums.tax)}
      {amount('total', 'Total', sums.total)}
      {button('go-to-checkout', 'Go to checkout', 'Go to checkout', onCheckout)}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1 },
  small: { minWidth: 48, minHeight: 48, borderWidth: 1, borderColor: '#999', borderRadius: 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 4, padding: 8 },
});
