import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PlanSelector } from '../../components/PlanSelector';
import { SecondaryButton } from '../../components/SecondaryButton';
import { useCart } from '../../context/CartContext';
import {
  formatXof,
  getProductById,
  type ProductVariant,
} from '../../data/mockCatalog';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<BuyerStackParamList, 'ProductDetail'>;

const { width } = Dimensions.get('window');

export function ProductDetailScreen({ navigation, route }: Props) {
  const product = getProductById(route.params.productId);
  const { addItem, itemCount } = useCart();
  const [imageIndex, setImageIndex] = useState(0);
  const [variantId, setVariantId] = useState(product?.variants[0]?.id);
  const [planId, setPlanId] = useState(product?.plans[0]?.id);

  const variant = useMemo(
    () => product?.variants.find((v) => v.id === variantId),
    [product, variantId],
  );
  const plan = useMemo(
    () => product?.plans.find((p) => p.id === planId),
    [product, planId],
  );

  if (!product || !plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Produit introuvable.</Text>
      </View>
    );
  }

  function onAdd() {
    addItem({ product: product!, variant, plan: plan! });
  }

  return (
    <View style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Cart')}
          style={styles.iconBtn}
        >
          <Ionicons name="cart-outline" size={24} color={colors.accent} />
          {itemCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setImageIndex(idx);
          }}
        >
          {product.images.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.hero} />
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {product.images.map((uri, index) => (
            <View
              key={uri}
              style={[styles.dot, index === imageIndex && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{formatXof(product.price)}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.star} />
            <Text style={styles.rating}>
              {product.rating.toFixed(1)} ({product.reviewCount} avis)
            </Text>
          </View>
          <Text style={styles.description}>{product.description}</Text>

          <Text style={styles.section}>
            {product.variants[0]?.kind === 'size' ? 'Taille' : 'Couleur'}
          </Text>
          <View style={styles.chips}>
            {product.variants.map((item: ProductVariant) => {
              const active = item.id === variantId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setVariantId(item.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <PlanSelector
            price={product.price}
            plans={product.plans}
            selectedId={plan.id}
            onSelect={(next) => setPlanId(next.id)}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <SecondaryButton label="Ajouter au panier" onPress={onAdd} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 12,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  badge: {
    position: 'absolute',
    right: 2,
    top: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  scroll: { paddingBottom: 140 },
  hero: { width, height: width * 0.95, backgroundColor: colors.bgSoft },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  dotActive: { backgroundColor: colors.accent },
  body: { padding: 20, gap: 10 },
  name: { fontSize: 26, fontWeight: '800', color: colors.ink },
  price: { fontSize: 22, fontWeight: '800', color: colors.accent },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { color: colors.muted, fontWeight: '600' },
  description: { color: colors.muted, lineHeight: 21, marginTop: 4 },
  section: { marginTop: 8, fontWeight: '700', color: colors.ink, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.ink, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    gap: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
