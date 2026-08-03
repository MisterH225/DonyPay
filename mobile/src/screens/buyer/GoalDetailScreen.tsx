import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { getGoal } from '../../api/savings';
import type { SavingsGoal } from '../../api/types';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';
import { formatXof, progressPercent } from '../../utils/money';

type Props = NativeStackScreenProps<BuyerStackParamList, 'GoalDetail'>;

export function GoalDetailScreen({ route, navigation }: Props) {
  const { goalId } = route.params;
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGoal(await getGoal(goalId));
    } catch (err) {
      Alert.alert('Objectif', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pct = progressPercent(goal?.savedAmount, goal?.targetAmount);
  const pending = goal?.installments?.filter((i) => i.status === 'pending') ?? [];

  return (
    <Screen
      title={goal?.product?.name ?? 'Objectif'}
      subtitle={`Mode ${goal?.mode ?? '—'} · ${goal?.status ?? ''}`}
      loading={loading}
    >
      {goal ? (
        <>
          <View style={styles.card}>
            <Text style={styles.amounts}>
              {formatXof(goal.savedAmount)} / {formatXof(goal.targetAmount)}
            </Text>
            <ProgressBar value={pct} />
            <Text style={styles.pct}>{Math.round(pct)}% atteint</Text>
          </View>

          <Text style={styles.section}>Échéances</Text>
          {(goal.installments ?? []).map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowTitle}>
                  #{item.sequence} · {formatXof(item.amount)}
                </Text>
                <Text style={styles.rowMeta}>
                  Échéance {new Date(item.dueDate).toLocaleDateString('fr-FR')} ·{' '}
                  {item.status}
                </Text>
              </View>
              {item.status === 'pending' ? (
                <PrimaryButton
                  label="Lien"
                  onPress={() =>
                    navigation.navigate('PaymentLinkShare', {
                      installmentId: item.id,
                      goalId: goal.id,
                      amount: String(item.amount),
                      productName: goal.product?.name,
                    })
                  }
                  style={styles.linkBtn}
                />
              ) : null}
            </View>
          ))}

          {goal.mode === 'schedule' && pending.length === 0 ? (
            <Text style={styles.hint}>Toutes les échéances sont soldées.</Text>
          ) : null}

          {goal.mode === 'flexi' ? (
            <Text style={styles.hint}>
              Versements libres jusqu’au{' '}
              {goal.flexiEndsAt
                ? new Date(goal.flexiEndsAt).toLocaleDateString('fr-FR')
                : '—'}
              .
            </Text>
          ) : null}
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
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  amounts: { fontSize: 18, fontWeight: '700', color: colors.ink },
  pct: { fontWeight: '700', color: colors.accent },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowTitle: { fontWeight: '700', color: colors.ink },
  rowMeta: { color: colors.muted, fontSize: 13 },
  linkBtn: { paddingHorizontal: 12, minHeight: 40 },
  hint: { color: colors.muted },
});
