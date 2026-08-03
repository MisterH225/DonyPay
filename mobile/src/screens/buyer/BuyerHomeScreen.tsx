import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoleToggle } from '../../components/RoleToggle';

export function BuyerHomeScreen() {
  return (
    <View style={styles.container}>
      <RoleToggle />
      <Text style={styles.title}>Espace acheteur</Text>
      <Text style={styles.subtitle}>Hello from buyer home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0B3D5C',
  },
  subtitle: {
    fontSize: 16,
    color: '#4A6070',
  },
});
