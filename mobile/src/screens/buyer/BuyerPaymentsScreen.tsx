import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function BuyerPaymentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes paiements</Text>
      <Text style={styles.subtitle}>Hello from buyer payments</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B3D5C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4A6070',
  },
});
