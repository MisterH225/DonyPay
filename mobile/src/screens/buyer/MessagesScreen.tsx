import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

const MOCK = [
  {
    id: '1',
    title: 'Versement reçu',
    body: '15 000 XOF crédités sur Smartphone X12.',
  },
  {
    id: '2',
    title: 'Rappel échéance',
    body: 'Prochaine échéance dans 3 jours.',
  },
];

export function MessagesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Messages</Text>
      <View style={styles.list}>
        {MOCK.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 8,
    marginBottom: 16,
  },
  list: { gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.white,
    gap: 4,
  },
  cardTitle: { fontWeight: '800', color: colors.ink },
  cardBody: { color: colors.muted },
});
