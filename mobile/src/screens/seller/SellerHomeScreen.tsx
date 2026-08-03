import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoleToggle } from '../../components/RoleToggle';

export function SellerHomeScreen() {
  return (
    <View style={styles.container}>
      <RoleToggle />
      <Text style={styles.title}>Espace vendeur</Text>
      <Text style={styles.subtitle}>Hello from seller home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
    backgroundColor: '#F8F5F0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2F4A3A',
  },
  subtitle: {
    fontSize: 16,
    color: '#5A6B5F',
  },
});
