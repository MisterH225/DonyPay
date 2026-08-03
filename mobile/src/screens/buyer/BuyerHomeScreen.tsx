import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { RoleToggle } from '../../components/RoleToggle';
import { colors } from '../../theme/colors';

export function BuyerHomeScreen() {
  return (
    <View style={styles.container}>
      <BrandLogo variant="full" height={56} />
      <RoleToggle />
      <Text style={styles.title}>Espace acheteur</Text>
      <Text style={styles.subtitle}>
        Épargne flexible, paiements délégués — DôniPay.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    lineHeight: 22,
  },
});
