import React, { useState } from 'react';
import {
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
import { useCart } from '../../context/CartContext';
import { formatXof } from '../../data/mockCatalog';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<BuyerStackParamList, 'Checkout'>;

type PayMethod = 'orange' | 'mtn' | 'moov' | 'wave' | 'card';

const PAY_METHODS: { id: PayMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'orange', label: 'Orange Money', icon: 'phone-portrait-outline' },
  { id: 'mtn', label: 'MTN MoMo', icon: 'phone-portrait-outline' },
  { id: 'moov', label: 'Moov Money', icon: 'phone-portrait-outline' },
  { id: 'wave', label: 'Wave', icon: 'wallet-outline' },
  { id: 'card', label: 'Carte bancaire', icon: 'card-outline' },
];

const SHIPPING = 2_000;

export function CheckoutScreen({ navigation }: Props) {
  const { lines, subtotal } = useCart();
  const [address, setAddress] = useState('Cocody, Abidjan');
  const [city, setCity] = useState('Abidjan');
  const [phone, setPhone] = useState('+225 07 00 00 00 00');
  const [method, setMethod] = useState<PayMethod>('orange');
  const total = subtotal + (lines.length ? SHIPPING : 0);

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>Adresse de livraison</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Adresse"
          placeholderTextColor={colors.muted}
        />
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Ville"
          placeholderTextColor={colors.muted}
        />
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Téléphone"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
        />

        <Text style={styles.section}>Mode de paiement</Text>
        <View style={styles.methods}>
          {PAY_METHODS.map((item) => {
            const active = item.id === method;
            return (
              <Pressable
                key={item.id}
                onPress={() => setMethod(item.id)}
                style={[styles.method, active && styles.methodActive]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={active ? colors.white : colors.accent}
                />
                <Text
                  style={[styles.methodLabel, active && styles.methodLabelActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Récapitulatif</Text>
        <View style={styles.summary}>
          {lines.map((line) => (
            <View key={line.key} style={styles.summaryRow}>
              <Text style={styles.summaryText} numberOfLines={1}>
                {line.quantity}× {line.product.name}
              </Text>
              <Text style={styles.summaryText}>
                {formatXof(line.product.price * line.quantity)}
              </Text>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryMuted}>Sous-total</Text>
            <Text style={styles.summaryMuted}>{formatXof(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryMuted}>Frais de livraison</Text>
            <Text style={styles.summaryMuted}>
              {formatXof(lines.length ? SHIPPING : 0)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatXof(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Confirmer la commande"
          disabled={lines.length === 0}
          onPress={() =>
            navigation.navigate('OrderConfirmation', {
              orderId: `DP-${Date.now().toString().slice(-8)}`,
              total,
            })
          }
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
  scroll: { padding: 16, gap: 10, paddingBottom: 120 },
  section: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '800',
    color: colors.ink,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  methods: { gap: 8 },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.white,
  },
  methodActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  methodLabel: { color: colors.ink, fontWeight: '700' },
  methodLabelActive: { color: colors.white },
  summary: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    backgroundColor: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryText: { color: colors.ink, flex: 1, fontWeight: '600' },
  summaryMuted: { color: colors.muted },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    marginTop: 2,
  },
  totalLabel: { fontWeight: '800', color: colors.ink, fontSize: 16 },
  totalValue: { fontWeight: '800', color: colors.accent, fontSize: 18 },
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
