import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CategoryPill } from '../../components/CategoryPill';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';
import {
  CATEGORIES,
  MOCK_PRODUCTS,
  type ProductCategory,
} from '../../data/mockCatalog';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';

export function ProductListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const { itemCount } = useCart();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Tous');

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_PRODUCTS.filter((product) => {
      const catOk = category === 'Tous' || product.category === category;
      const textOk =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q);
      return catOk && textOk;
    });
  }, [category, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.brand}>DôniPay</Text>
        <Pressable
          onPress={() => navigation.navigate('Cart')}
          style={styles.cartBtn}
          accessibilityLabel="Panier"
        >
          <Ionicons name="cart-outline" size={24} color={colors.accent} />
          {itemCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.accent} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un produit"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        renderItem={({ item }) => (
          <CategoryPill
            label={item}
            active={item === category}
            onPress={() => setCategory(item)}
          />
        )}
      />

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun produit trouvé.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard
              product={item}
              onPress={() =>
                navigation.navigate('ProductDetail', { productId: item.id })
              }
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.accent,
  },
  cartBtn: { padding: 6 },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  searchWrap: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
  },
  search: { flex: 1, color: colors.ink, paddingVertical: 10 },
  pills: { paddingHorizontal: 20, paddingBottom: 12 },
  grid: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  row: { gap: 12 },
  cell: { flex: 1 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
