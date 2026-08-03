import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../components/PrimaryButton';
import { QuantityStepper } from '../../components/QuantityStepper';
import { useCart } from '../../context/CartContext';
import { formatXof } from '../../data/mockCatalog';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<BuyerStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props) {
  const { lines, subtotal, setQuantity, removeItem } = useCart();
  const [promo, setPromo] = useState('');

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>Panier</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {lines.length === 0 ? (
          <Text style={styles.empty}>Votre panier est vide.</Text>
        ) : (
          lines.map((line) => (
            <View key={line.key} style={styles.row}>
              <Image
                source={{ uri: line.product.images[0] }}
                style={styles.thumb}
              />
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>
                  {line.product.name}
                </Text>
                <Text style={styles.meta}>
                  {line.variant ? `${line.variant.label} · ` : ''}
                  {line.plan.label}
                </Text>
                <Text style={styles.price}>
                  {formatXof(line.product.price)}
                </Text>
                <View style={styles.actions}>
                  <QuantityStepper
                    value={line.quantity}
                    onChange={(q) => setQuantity(line.key, q)}
                  />
                  <Pressable onPress={() => removeItem(line.key)}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.danger}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={styles.promoBox}>
          <Text style={styles.promoLabel}>Code promo (optionnel)</Text>
          <TextInput
            value={promo}
            onChangeText={setPromo}
            placeholder="DONI10"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            style={styles.promoInput}
          />
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatXof(subtotal)}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Passer au paiement"
          disabled={lines.length === 0}
          onPress={() => navigation.navigate('Checkout')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 54,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  scroll: { padding: 16, gap: 14, paddingBottom: 120 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 48 },
  row: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.white,
  },
  thumb: { width: 84, height: 84, borderRadius: 12, backgroundColor: colors.bgSoft },
  info: { flex: 1, gap: 4 },
  name: { fontWeight: '700', color: colors.ink },
  meta: { color: colors.muted, fontSize: 12 },
  price: { color: colors.accent, fontWeight: '800' },
  actions: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoBox: { gap: 8 },
  promoLabel: { color: colors.muted, fontWeight: '600' },
  promoInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
  totalValue: { fontSize: 22, fontWeight: '800', color: colors.accent },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
