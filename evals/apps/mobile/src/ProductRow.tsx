import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from './lib/pricing.ts';
import type { Product } from './lib/pricing.ts';

type Props = { product: Product; onOpen: () => void; onAdd: () => void };

export function ProductRow({ product, onOpen, onAdd }: Props) {
  return (
    <View style={styles.cell}>
      <Pressable style={styles.info} onPress={onOpen} testID={`product-${product.id}`} accessibilityRole="button">
        <Text style={styles.name}>{product.name}</Text>
        <Text>
          {formatMoney(product.price)} {product.onSale ? 'Sale' : ''}
        </Text>
      </Pressable>
      <Pressable style={styles.add} onPress={onAdd} testID={`add-${product.id}`} accessibilityRole="button">
        <Text style={styles.addText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#ddd' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  add: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#225', alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 24 },
});
