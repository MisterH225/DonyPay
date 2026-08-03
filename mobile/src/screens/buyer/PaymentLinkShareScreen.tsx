import React, { useState } from 'react';
import {
  Alert,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { createPaymentLink } from '../../api/paymentLinks';
import type { PaymentLinkCreated } from '../../api/types';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';
import { formatXof } from '../../utils/money';

type Props = NativeStackScreenProps<BuyerStackParamList, 'PaymentLinkShare'>;

export function PaymentLinkShareScreen({ route }: Props) {
  const { installmentId, amount, productName } = route.params;
  const [link, setLink] = useState<PaymentLinkCreated | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      setLink(await createPaymentLink(installmentId));
    } catch (err) {
      Alert.alert('Lien', err instanceof Error ? err.message : 'Échec');
    } finally {
      setLoading(false);
    }
  };

  const share = async () => {
    if (!link) return;
    const message = `Aide-moi à payer mon échéance DonyPay${
      productName ? ` pour « ${productName} »` : ''
    } (${formatXof(amount)}) :\n${link.publicUrl}`;

    try {
      await Share.share({ message, url: link.publicUrl });
    } catch {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(link.publicUrl);
      }
    }
  };

  return (
    <Screen
      title="Paiement délégué"
      subtitle="Génère un lien unique à partager à un tiers (Mobile Money)."
    >
      <View style={styles.card}>
        <Text style={styles.label}>Montant</Text>
        <Text style={styles.amount}>{formatXof(amount)}</Text>
        {productName ? (
          <Text style={styles.meta}>Produit : {productName}</Text>
        ) : null}
      </View>

      {!link ? (
        <PrimaryButton
          label="Générer le lien"
          onPress={() => void generate()}
          loading={loading}
        />
      ) : (
        <>
          <View style={styles.linkBox}>
            <Text style={styles.label}>Lien public</Text>
            <Text selectable style={styles.url}>
              {link.publicUrl}
            </Text>
            <Text style={styles.meta}>
              Expire le {new Date(link.expiresAt).toLocaleString('fr-FR')} · TTL{' '}
              {link.ttlHours}h
            </Text>
          </View>
          <PrimaryButton label="Partager" onPress={() => void share()} />
          <PrimaryButton
            label="Régénérer"
            onPress={() => void generate()}
            variant="secondary"
            loading={loading}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  label: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  amount: { fontSize: 28, fontWeight: '700', color: colors.ink },
  meta: { color: colors.muted, fontSize: 13 },
  linkBox: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  url: { color: colors.ink, fontSize: 14, lineHeight: 20 },
});
