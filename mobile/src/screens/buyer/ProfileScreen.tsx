import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoleToggle } from '../../components/RoleToggle';
import { BrandLogo } from '../../components/BrandLogo';
import { colors } from '../../theme/colors';

export function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <BrandLogo variant="mark" height={64} />
      <Text style={styles.title}>Profil</Text>
      <Text style={styles.body}>Awa Koné · acheteur@donypay.demo</Text>
      <View style={styles.toggle}>
        <RoleToggle />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 8 },
  body: { color: colors.muted },
  toggle: { marginTop: 12 },
});
