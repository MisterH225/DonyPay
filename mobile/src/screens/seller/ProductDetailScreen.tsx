import React, { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getProduct } from '../../api/catalog';
import type { Product } from '../../api/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import type { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors } from '../../theme/colors';
import { formatXof } from '../../utils/money';

type Props = NativeStackScreenProps<SellerStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ route }: Props) {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const next = await getProduct(productId);
          if (!cancelled) setProduct(next);
        } catch (err) {
          Alert.alert(
            'Produit',
            err instanceof Error ? err.message : 'Erreur',
          );
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [productId]),
  );

  return (
    <Screen
      title={product?.name ?? 'Produit'}
      subtitle="Partage le QR / lien pour lancer un objectif d’épargne."
      loading={loading}
    >
      {product ? (
        <>
          <View style={styles.card}>
            <Text style={styles.price}>{formatXof(product.price)}</Text>
            <Text style={styles.label}>Payload QR</Text>
            <Text selectable style={styles.payload}>
              {product.qrPayload}
            </Text>
          </View>
          <PrimaryButton
            label="Partager le lien produit"
            onPress={() =>
              void Share.share({
                message: `Produit DonyPay « ${product.name} » (${formatXof(product.price)})\n${product.qrPayload}`,
                url: product.qrPayload,
              })
            }
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  price: { fontSize: 28, fontWeight: '700', color: colors.sellerInk },
  label: { color: colors.muted, fontWeight: '600', marginTop: 8 },
  payload: { color: colors.ink, lineHeight: 20 },
});
