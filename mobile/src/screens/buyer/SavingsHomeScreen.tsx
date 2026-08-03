import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

export function SavingsHomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.box}>
        <Text style={styles.title}>Mes épargnes</Text>
        <Text style={styles.body}>
          Vos plans actifs apparaîtront ici. (UI mock — pas d’API)
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: '45%' }]} />
        </View>
        <Text style={styles.meta}>Exemple de progression · 45%</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  box: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    backgroundColor: colors.white,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  body: { color: colors.muted, lineHeight: 21 },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { height: '100%', backgroundColor: colors.accent },
  meta: { color: colors.accent, fontWeight: '700' },
});
