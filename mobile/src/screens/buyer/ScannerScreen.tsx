import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export function ScannerScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.box}>
        <View style={styles.icon}>
          <Ionicons name="qr-code" size={40} color={colors.white} />
        </View>
        <Text style={styles.title}>Scanner QR</Text>
        <Text style={styles.body}>
          Cadrez le QR produit DôniPay pour ouvrir la fiche. (UI mock)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  box: { alignItems: 'center', gap: 12, maxWidth: 320 },
  icon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  body: { textAlign: 'center', color: colors.muted, lineHeight: 21 },
});
