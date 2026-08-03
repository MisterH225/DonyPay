import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function SellerCatalogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mon catalogue</Text>
      <Text style={styles.subtitle}>Hello from seller catalog</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F8F5F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2F4A3A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5A6B5F',
  },
});
