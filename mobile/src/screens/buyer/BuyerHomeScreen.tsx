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
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { RoleToggle } from '../../components/RoleToggle';
import { getGoal, listGoals } from '../../api/savings';
import type { SavingsGoal } from '../../api/types';
import { useSession } from '../../context/SessionContext';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';
import { formatXof, progressPercent, toNumber } from '../../utils/money';

export function BuyerHomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const { userId, user, loading: sessionLoading, error: sessionError } =
    useSession();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const list = await listGoals(userId);
      const detailed = await Promise.all(
        list.slice(0, 10).map(async (goal) => {
          try {
            return await getGoal(goal.id);
          } catch {
            return goal;
          }
        }),
      );
      setGoals(detailed);
    } catch (err) {
      Alert.alert('Épargne', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const active = goals.filter(
    (g) => g.status === 'active' || g.status === 'ready_for_withdrawal',
  );

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
            tintColor={colors.ink}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>DonyPay</Text>
            <Text style={styles.subtitle}>
              {user
                ? `Bonjour ${user.firstName ?? 'acheteur'} — suis ta progression.`
                : 'Tableau de bord acheteur'}
            </Text>
          </View>
          <RoleToggle />
        </View>

        {sessionError ? <Text style={styles.error}>{sessionError}</Text> : null}

        <PrimaryButton
          label="Créer un objectif depuis un produit"
          onPress={() => navigation.navigate('CreateGoal')}
        />
        <PrimaryButton
          label="Compléter mon KYC"
          onPress={() => navigation.navigate('BuyerTabs', { screen: 'KYC' })}
          variant="secondary"
        />

        <Text style={styles.section}>Progression</Text>
        {sessionLoading || loading ? (
          <Text style={styles.muted}>Chargement…</Text>
        ) : active.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun objectif actif</Text>
            <Text style={styles.emptyBody}>
              Choisis un produit et lance ton plan d’épargne.
            </Text>
          </View>
        ) : (
          active.map((goal) => {
            const pct = progressPercent(goal.savedAmount, goal.targetAmount);
            const name = goal.product?.name ?? `Objectif ${goal.id.slice(0, 8)}`;
            return (
              <Pressable
                key={goal.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('GoalDetail', { goalId: goal.id })
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{name}</Text>
                  <Text style={styles.cardStatus}>{goal.status}</Text>
                </View>
                <Text style={styles.cardAmounts}>
                  {formatXof(goal.savedAmount)} / {formatXof(goal.targetAmount)}
                </Text>
                <ProgressBar value={pct} />
                <Text style={styles.cardPct}>{Math.round(pct)}% atteint</Text>
                {goal.mode === 'schedule' && goal.installments ? (
                  <Text style={styles.cardMeta}>
                    {
                      goal.installments.filter((i) => i.status === 'paid')
                        .length
                    }
                    /{goal.installments.length} échéances · reste{' '}
                    {formatXof(
                      toNumber(goal.targetAmount) - toNumber(goal.savedAmount),
                    )}
                  </Text>
                ) : null}
              </Pressable>
            );
          })
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
    marginBottom: 4,
  },
  headerText: { flex: 1, gap: 4 },
  brand: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: 'Georgia',
  },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  error: { color: colors.danger, fontWeight: '600' },
  section: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: 'Georgia',
  },
  muted: { color: colors.muted },
  empty: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  emptyTitle: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  emptyBody: { color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink },
  cardStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  cardAmounts: { color: colors.muted, fontWeight: '600' },
  cardPct: { color: colors.ink, fontWeight: '700' },
  cardMeta: { color: colors.muted, fontSize: 13 },
});
