import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { placeOrder } from './api.ts';
import type { Cart } from './lib/cart.ts';
import { formatMoney, totals } from './lib/pricing.ts';
import { validateCheckout } from './lib/validation.ts';
import type { CheckoutForm, FormErrors } from './lib/validation.ts';

type Props = { cart: Cart; code: string; onPlaced: () => void };
type Status = { name: 'idle' | 'submitting' | 'failed' } | { name: 'placed'; orderNumber: string };

export function CheckoutScreen(props: Props) {
  const { width, height } = useWindowDimensions();
  const orientation = width > height ? 'landscape' : 'portrait';
  return <CheckoutFormView key={orientation} {...props} />;
}

function CheckoutFormView({ cart, code, onPlaced }: Props) {
  const [form, setForm] = useState<CheckoutForm>({ name: '', email: '', postcode: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status>({ name: 'idle' });

  const submit = async () => {
    const found = validateCheckout(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStatus({ name: 'submitting' });
    const result = await placeOrder(form, cart.lines);
    if (result.ok && result.orderNumber) {
      setStatus({ name: 'placed', orderNumber: result.orderNumber });
      onPlaced();
    } else {
      setStatus({ name: 'failed' });
    }
  };

  if (status.name === 'placed') return <Text testID="order-placed">Order placed: {status.orderNumber}</Text>;

  const field = (name: keyof CheckoutForm, label: string) => (
    <View>
      <Text>{label}</Text>
      <TextInput
        style={styles.input}
        testID={`field-${name}`}
        accessibilityLabel={label}
        autoCapitalize="none"
        value={form[name]}
        onChangeText={(text) => setForm({ ...form, [name]: text })}
      />
      {errors[name] ? <Text testID={`error-${name}`}>{errors[name]}</Text> : null}
    </View>
  );

  return (
    <View style={styles.form}>
      {field('name', 'Name')}
      {field('email', 'Email')}
      {field('postcode', 'Postcode')}
      <Text testID="checkout-total">Total to pay: {formatMoney(totals(cart.lines, code).total)}</Text>
      {status.name === 'failed' ? <Text testID="order-failed">We could not place your order</Text> : null}
      <Pressable
        style={styles.button}
        testID="place-order"
        accessibilityRole="button"
        accessibilityLabel="Place order"
        disabled={status.name === 'submitting'}
        onPress={submit}>
        <Text style={styles.buttonText}>Place order</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 8 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 4, padding: 8 },
  button: { backgroundColor: '#225', padding: 12, borderRadius: 4, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
