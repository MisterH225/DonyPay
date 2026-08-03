import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { confirmHandover, getGoal } from '../../api/savings';
import type { SavingsGoal } from '../../api/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { useSession } from '../../context/SessionContext';
import type { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors } from '../../theme/colors';
import { formatXof, progressPercent } from '../../utils/money';

type Props = NativeStackScreenProps<SellerStackParamList, 'ConfirmHandover'>;

export function ConfirmHandoverScreen({ navigation, route }: Props) {
  const { goalId } = route.params;
  const { userId } = useSession();
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGoal(await getGoal(goalId));
    } catch (err) {
      Alert.alert('Remise', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const buyerName = goal?.user
    ? [goal.user.firstName, goal.user.lastName].filter(Boolean).join(' ') ||
      goal.user.email
    : 'Acheteur';
  const ready = goal?.status === 'ready_for_withdrawal';
  const pct = progressPercent(goal?.savedAmount, goal?.targetAmount);

  async function onConfirm() {
    if (!userId || !goal) return;
    setSubmitting(true);
    try {
      const updated = await confirmHandover(goal.id, userId);
      setGoal(updated);
      Alert.alert('Remise confirmée', 'Le produit a été marqué comme remis.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Remise', err instanceof Error ? err.message : 'Échec');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Remise produit"
      subtitle="Confirme la remise physique une fois l’objectif atteint."
      loading={loading}
    >
      {goal ? (
        <>
          <View style={styles.card}>
            <Text style={styles.title}>
              {goal.product?.name ?? `Objectif ${goal.id.slice(0, 8)}`}
            </Text>
            <Text style={styles.meta}>Acheteur : {buyerName}</Text>
            <Text style={styles.meta}>Statut : {goal.status}</Text>
            <Text style={styles.amounts}>
              {formatXof(goal.savedAmount)} / {formatXof(goal.targetAmount)}
            </Text>
            <ProgressBar value={pct} />
          </View>

          {ready ? (
            <PrimaryButton
              label="Confirmer la remise du produit"
              onPress={() => void onConfirm()}
              loading={submitting}
            />
          ) : goal.status === 'completed' ? (
            <Text style={styles.done}>Produit déjà remis.</Text>
          ) : (
            <Text style={styles.wait}>
              L’objectif n’est pas encore prêt pour retrait.
            </Text>
          )}
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
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.sellerInk },
  meta: { color: colors.muted },
  amounts: { fontWeight: '700', color: colors.ink, marginTop: 4 },
  done: { color: colors.success, fontWeight: '700', textAlign: 'center' },
  wait: { color: colors.muted, textAlign: 'center' },
});
