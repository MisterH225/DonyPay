import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listShopProducts } from '../../api/catalog';
import type { Product } from '../../api/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { useShop } from '../../context/ShopContext';
import type { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors } from '../../theme/colors';
import { formatXof } from '../../utils/money';

export function SellerCatalogScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const { shop, loading: shopLoading, refresh: refreshShop } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await refreshShop();
      if (!current?.id) {
        setProducts([]);
        return;
      }
      setProducts(await listShopProducts(current.id));
    } catch (err) {
      Alert.alert('Catalogue', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [refreshShop]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!shop && !shopLoading && !loading) {
    return (
      <Screen
        title="Catalogue"
        subtitle="Crée d’abord ta boutique pour publier des produits."
      >
        <PrimaryButton
          label="Créer ma boutique"
          onPress={() => navigation.navigate('CreateShop')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Catalogue"
      subtitle={shop ? `Boutique « ${shop.name} »` : 'Produits'}
      loading={shopLoading || loading}
      scroll
    >
      <View style={styles.actions}>
        <PrimaryButton
          label="Ajouter un produit"
          onPress={() => navigation.navigate('CreateProduct')}
          style={{ flex: 1 }}
        />
        <PrimaryButton
          label="Scanner"
          variant="secondary"
          onPress={() => navigation.navigate('ScanQr', { mode: 'lookup' })}
          style={{ flex: 1 }}
        />
      </View>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucun produit</Text>
          <Text style={styles.emptyBody}>
            Ajoute un produit par saisie ou scan QR / code-barres.
          </Text>
        </View>
      ) : (
        products.map((product) => (
          <Pressable
            key={product.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('ProductDetail', { productId: product.id })
            }
          >
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.meta}>{formatXof(product.price)}</Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
  empty: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  emptyTitle: { fontWeight: '700', color: colors.sellerInk },
  emptyBody: { color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  meta: { color: colors.muted },
});
