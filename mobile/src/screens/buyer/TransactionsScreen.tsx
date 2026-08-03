import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { listNotifications } from '../../api/notifications';
import { getGoal, listGoals } from '../../api/savings';
import type { NotificationItem, SavingsGoal } from '../../api/types';
import { useSession } from '../../context/SessionContext';
import { colors } from '../../theme/colors';
import { formatXof } from '../../utils/money';

type TxRow = {
  id: string;
  title: string;
  body: string;
  date: string;
  kind: 'deposit' | 'notification';
};

export function TransactionsScreen() {
  const { userId, loading: sessionLoading } = useSession();
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [notifications, goals] = await Promise.all([
        listNotifications(userId).catch(() => [] as NotificationItem[]),
        listGoals(userId).catch(() => [] as SavingsGoal[]),
      ]);

      const detailed = await Promise.all(
        goals.map(async (goal) => {
          try {
            return await getGoal(goal.id);
          } catch {
            return goal;
          }
        }),
      );

      const depositRows: TxRow[] = detailed.flatMap((goal) =>
        (goal.deposits ?? []).map((deposit) => ({
          id: deposit.id,
          kind: 'deposit' as const,
          title: `Versement · ${goal.product?.name ?? goal.id.slice(0, 8)}`,
          body: formatXof(deposit.amount),
          date: deposit.createdAt,
        })),
      );

      const notifRows: TxRow[] = notifications.map((item) => ({
        id: item.id,
        kind: 'notification' as const,
        title: item.title,
        body: item.body,
        date: item.createdAt,
      }));

      setRows(
        [...depositRows, ...notifRows].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );
    } catch (err) {
      Alert.alert('Historique', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      title="Historique"
      subtitle="Versements et notifications liés à tes plans."
      loading={sessionLoading || loading}
    >
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucune transaction</Text>
          <Text style={styles.emptyBody}>
            Les versements et alertes apparaîtront ici.
          </Text>
        </View>
      ) : (
        rows.map((row) => (
          <View key={`${row.kind}-${row.id}`} style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.title}>{row.title}</Text>
              <Text style={styles.kind}>
                {row.kind === 'deposit' ? 'Versement' : 'Notif'}
              </Text>
            </View>
            <Text style={styles.body}>{row.body}</Text>
            <Text style={styles.date}>
              {new Date(row.date).toLocaleString('fr-FR')}
            </Text>
          </View>
        ))
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
  emptyTitle: { fontWeight: '700', color: colors.ink },
  emptyBody: { color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontWeight: '700', color: colors.ink },
  kind: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  body: { color: colors.muted },
  date: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
