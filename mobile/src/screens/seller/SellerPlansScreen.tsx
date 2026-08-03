import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listSellerGoals } from '../../api/savings';
import type { SavingsGoal } from '../../api/types';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { useSession } from '../../context/SessionContext';
import type { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors } from '../../theme/colors';
import { formatXof, progressPercent } from '../../utils/money';

export function SellerPlansScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const { userId, loading: sessionLoading } = useSession();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setGoals(await listSellerGoals(userId));
    } catch (err) {
      Alert.alert('Plans', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visible = goals.filter((g) => g.status !== 'cancelled');

  return (
    <Screen
      title="Plans d’épargne"
      subtitle="Suivi des objectifs liés à tes produits."
      loading={sessionLoading || loading}
    >
      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucun plan</Text>
          <Text style={styles.emptyBody}>
            Les objectifs créés par les acheteurs apparaîtront ici.
          </Text>
        </View>
      ) : (
        visible.map((goal) => {
          const pct = progressPercent(goal.savedAmount, goal.targetAmount);
          const ready = goal.status === 'ready_for_withdrawal';
          return (
            <Pressable
              key={goal.id}
              style={[styles.card, ready && styles.cardReady]}
              onPress={() => {
                if (ready || goal.status === 'completed') {
                  navigation.navigate('ConfirmHandover', { goalId: goal.id });
                }
              }}
            >
              <View style={styles.top}>
                <Text style={styles.title}>
                  {goal.product?.name ?? goal.id.slice(0, 8)}
                </Text>
                <Text style={styles.status}>{goal.status}</Text>
              </View>
              <Text style={styles.meta}>
                {formatXof(goal.savedAmount)} / {formatXof(goal.targetAmount)}
              </Text>
              <ProgressBar value={pct} />
              {ready ? (
                <Text style={styles.cta}>Confirmer la remise →</Text>
              ) : null}
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardReady: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontWeight: '700', color: colors.ink },
  status: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  meta: { color: colors.muted },
  cta: { color: colors.sellerInk, fontWeight: '700' },
});
