import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getProduct, listShopProducts } from '../../api/catalog';
import { createGoal } from '../../api/savings';
import type { Product } from '../../api/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { useSession } from '../../context/SessionContext';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';
import { formatXof, toNumber } from '../../utils/money';

type Props = NativeStackScreenProps<BuyerStackParamList, 'CreateGoal'>;
type Mode = 'schedule' | 'flexi';

const DEMO_SHOP_ID = process.env.EXPO_PUBLIC_DEMO_SHOP_ID;

function addMonthsIso(base: Date, months: number): string {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function buildEqualInstallments(total: number, months: number) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / months);
  const remainder = cents - base * months;
  const now = new Date();
  return Array.from({ length: months }, (_, index) => {
    const amountCents = base + (index < remainder ? 1 : 0);
    return {
      dueDate: addMonthsIso(now, index + 1),
      amount: amountCents / 100,
    };
  });
}

export function CreateGoalScreen({ navigation, route }: Props) {
  const { userId } = useSession();
  const [mode, setMode] = useState<Mode>('schedule');
  const [months, setMonths] = useState('6');
  const [productId, setProductId] = useState(route.params?.productId ?? '');
  const [product, setProduct] = useState<Product | null>(null);
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [loadingShop, setLoadingShop] = useState(Boolean(DEMO_SHOP_ID));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DEMO_SHOP_ID) {
      setLoadingShop(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await listShopProducts(DEMO_SHOP_ID);
        if (!cancelled) setShopProducts(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossible de charger la boutique démo',
          );
        }
      } finally {
        if (!cancelled) setLoadingShop(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = productId.trim();
    if (!id || id.length < 32) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    setLoadingProduct(true);
    (async () => {
      try {
        const next = await getProduct(id);
        if (!cancelled) {
          setProduct(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setProduct(null);
          setError(err instanceof Error ? err.message : 'Produit introuvable');
        }
      } finally {
        if (!cancelled) setLoadingProduct(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function onSubmit() {
    setError(null);
    if (!userId) {
      setError('Session utilisateur indisponible.');
      return;
    }
    if (!product) {
      setError('Sélectionnez un produit valide.');
      return;
    }
    const duration = Number(months);
    if (!Number.isFinite(duration) || duration < 1 || duration > 36) {
      setError('Durée entre 1 et 36 mois.');
      return;
    }

    setSubmitting(true);
    try {
      const price = toNumber(product.price);
      const goal =
        mode === 'schedule'
          ? await createGoal({
              userId,
              productId: product.id,
              mode: 'schedule',
              installments: buildEqualInstallments(price, duration),
            })
          : await createGoal({
              userId,
              productId: product.id,
              mode: 'flexi',
              flexiStartsAt: new Date().toISOString(),
              flexiEndsAt: addMonthsIso(new Date(), duration),
            });
      navigation.replace('GoalDetail', { goalId: goal.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Nouvel objectif"
      subtitle="Choisis un produit du catalogue, puis le mode d’épargne."
      scroll
    >
      {loadingShop ? (
        <ActivityIndicator color={colors.ink} />
      ) : shopProducts.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>Produits de la boutique démo</Text>
          {shopProducts.map((item) => {
            const active = item.id === productId;
            return (
              <Pressable
                key={item.id}
                onPress={() => setProductId(item.id)}
                style={[styles.product, active && styles.productActive]}
              >
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productMeta}>{formatXof(item.price)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Text style={styles.label}>ID produit (UUID)</Text>
      <TextInput
        style={styles.input}
        value={productId}
        onChangeText={setProductId}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        placeholderTextColor={colors.muted}
      />

      {loadingProduct ? <ActivityIndicator color={colors.ink} /> : null}
      {product ? (
        <View style={styles.selected}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productMeta}>
            Cible : {formatXof(product.price)} (calculée par savings-engine)
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Mode</Text>
      <View style={styles.modeRow}>
        {(['schedule', 'flexi'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setMode(value)}
            style={[styles.modeChip, mode === value && styles.modeChipActive]}
          >
            <Text
              style={[
                styles.modeText,
                mode === value && styles.modeTextActive,
              ]}
            >
              {value === 'schedule' ? 'Échéancier' : 'Flexi'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>
        {mode === 'schedule' ? 'Nombre d’échéances (mois)' : 'Durée flexi (mois)'}
      </Text>
      <TextInput
        style={styles.input}
        value={months}
        onChangeText={setMonths}
        keyboardType="number-pad"
        placeholder="6"
        placeholderTextColor={colors.muted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label="Créer l’objectif"
        onPress={() => void onSubmit()}
        loading={submitting}
        disabled={!product || !userId}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  label: { color: colors.muted, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  product: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    backgroundColor: colors.white,
    gap: 4,
  },
  productActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  productName: { color: colors.ink, fontWeight: '700' },
  productMeta: { color: colors.muted, fontSize: 13 },
  selected: {
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  modeChipActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  modeText: { color: colors.ink, fontWeight: '700' },
  modeTextActive: { color: colors.white },
  error: { color: colors.danger, fontWeight: '600' },
});
