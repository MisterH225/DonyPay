import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SavingsPlanOption } from '../data/mockCatalog';
import { formatXof, installmentAmount } from '../data/mockCatalog';
import { colors } from '../theme/colors';

type Props = {
  price: number;
  plans: SavingsPlanOption[];
  selectedId: string;
  onSelect: (plan: SavingsPlanOption) => void;
};

export function PlanSelector({ price, plans, selectedId, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Plan d’épargne</Text>
      <View style={styles.list}>
        {plans.map((plan) => {
          const active = plan.id === selectedId;
          const per = installmentAmount(price, plan.installments);
          return (
            <Pressable
              key={plan.id}
              onPress={() => onSelect(plan)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipTitle, active && styles.chipTitleActive]}>
                {plan.label}
              </Text>
              <Text style={[styles.chipMeta, active && styles.chipMetaActive]}>
                {plan.installments === 1
                  ? formatXof(price)
                  : `${formatXof(per)} × ${plan.installments}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    minWidth: 104,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipTitle: { color: colors.ink, fontWeight: '700' },
  chipTitleActive: { color: colors.white },
  chipMeta: { color: colors.muted, marginTop: 2, fontSize: 12 },
  chipMetaActive: { color: '#F3E8FF' },
});
