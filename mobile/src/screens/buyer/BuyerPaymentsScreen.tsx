import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function BuyerPaymentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes paiements</Text>
      <Text style={styles.subtitle}>Suivi des échéances et liens délégués.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
  },
});
