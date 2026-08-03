import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRole } from '../context/RoleContext';
import type { UserRole } from '../types/role';

const OPTIONS: { role: UserRole; label: string }[] = [
  { role: 'buyer', label: 'Acheteur' },
  { role: 'seller', label: 'Vendeur' },
];

export function RoleToggle() {
  const { role, setRole } = useRole();

  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const active = option.role === role;
        return (
          <Pressable
            key={option.role}
            onPress={() => setRole(option.role)}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#E8EEF5',
    borderRadius: 10,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: '#0B3D5C',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A4A58',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
