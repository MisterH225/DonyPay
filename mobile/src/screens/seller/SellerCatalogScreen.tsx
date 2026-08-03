import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function SellerCatalogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mon catalogue</Text>
      <Text style={styles.subtitle}>Produits et QR DôniPay.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.sellerInk,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
  },
});
