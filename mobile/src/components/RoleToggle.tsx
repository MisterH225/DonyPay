import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRole } from '../context/RoleContext';
import type { UserRole } from '../types/role';
import { colors } from '../theme/colors';

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
    backgroundColor: colors.accentSoft,
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
    backgroundColor: colors.accent,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  labelActive: {
    color: colors.white,
  },
});
