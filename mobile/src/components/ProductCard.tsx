import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MockProduct } from '../data/mockCatalog';
import { formatXof } from '../data/mockCatalog';
import { colors } from '../theme/colors';

type Props = {
  product: MockProduct;
  onPress: () => void;
};

export function ProductCard({ product, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={{ uri: product.images[0] }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatXof(product.price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: { opacity: 0.92 },
  image: { width: '100%', height: 140, backgroundColor: colors.bgSoft },
  body: { padding: 12, gap: 6 },
  name: { color: colors.ink, fontWeight: '600', fontSize: 14, minHeight: 36 },
  price: { color: colors.accent, fontWeight: '800', fontSize: 15 },
});
