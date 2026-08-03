import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listSellerGoals } from '../../api/savings';
import type { SavingsGoal } from '../../api/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { RoleToggle } from '../../components/RoleToggle';
import { useSession } from '../../context/SessionContext';
import { useShop } from '../../context/ShopContext';
import type { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors } from '../../theme/colors';
import { formatXof, progressPercent } from '../../utils/money';

export function SellerHomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const { userId, user } = useSession();
  const { shop, loading: shopLoading, refresh: refreshShop } = useShop();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      await refreshShop();
      setGoals(await listSellerGoals(userId));
    } catch (err) {
      Alert.alert('Plans', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, refreshShop]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const active = goals.filter((g) => g.status === 'active');
  const ready = goals.filter((g) => g.status === 'ready_for_withdrawal');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.sellerInk}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>DonyPay</Text>
            <Text style={styles.subtitle}>
              {shop
                ? shop.name
                : user
                  ? `${user.firstName ?? 'Vendeur'} — configure ta boutique`
                  : 'Espace vendeur'}
            </Text>
          </View>
          <RoleToggle />
        </View>

        {!shop && !shopLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune boutique</Text>
            <Text style={styles.emptyBody}>
              Crée ta boutique pour publier des produits et suivre les plans.
            </Text>
            <PrimaryButton
              label="Créer ma boutique"
              onPress={() => navigation.navigate('CreateShop')}
            />
          </View>
        ) : (
          <>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{active.length}</Text>
                <Text style={styles.statLabel}>En cours</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{ready.length}</Text>
                <Text style={styles.statLabel}>À remettre</Text>
              </View>
            </View>

            <Text style={styles.section}>Remises à confirmer</Text>
            {loading ? (
              <Text style={styles.muted}>Chargement…</Text>
            ) : ready.length === 0 ? (
              <Text style={styles.muted}>Aucun objectif prêt pour retrait.</Text>
            ) : (
              ready.map((goal) => (
                <Pressable
                  key={goal.id}
                  style={styles.cardReady}
                  onPress={() =>
                    navigation.navigate('ConfirmHandover', { goalId: goal.id })
                  }
                >
                  <Text style={styles.cardTitle}>
                    {goal.product?.name ?? goal.id.slice(0, 8)}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {formatXof(goal.targetAmount)} atteints — toucher pour
                    confirmer la remise
                  </Text>
                </Pressable>
              ))
            )}

            <Text style={styles.section}>Plans d’épargne en cours</Text>
            {loading ? null : active.length === 0 ? (
              <Text style={styles.muted}>Aucun plan actif pour l’instant.</Text>
            ) : (
              active.map((goal) => {
                const pct = progressPercent(goal.savedAmount, goal.targetAmount);
                return (
                  <View key={goal.id} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {goal.product?.name ?? goal.id.slice(0, 8)}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {formatXof(goal.savedAmount)} /{' '}
                      {formatXof(goal.targetAmount)} · {goal.mode}
                    </Text>
                    <ProgressBar value={pct} />
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: { flex: 1, gap: 4 },
  brand: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.sellerInk,
    fontFamily: 'Georgia',
  },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.sellerInk,
  },
  statLabel: { color: colors.muted, marginTop: 2 },
  section: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: colors.sellerInk,
    fontFamily: 'Georgia',
  },
  muted: { color: colors.muted },
  empty: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  emptyTitle: { fontWeight: '700', color: colors.sellerInk, fontSize: 16 },
  emptyBody: { color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardReady: {
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  cardTitle: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  cardMeta: { color: colors.muted, fontSize: 13 },
});
