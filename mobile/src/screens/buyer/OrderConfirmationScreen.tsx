import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SecondaryButton } from '../../components/SecondaryButton';
import { useCart } from '../../context/CartContext';
import { formatXof } from '../../data/mockCatalog';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<BuyerStackParamList, 'OrderConfirmation'>;

export function OrderConfirmationScreen({ navigation, route }: Props) {
  const { clear } = useCart();
  const { orderId, total } = route.params;

  useEffect(() => {
    clear();
    // Une seule fois à l’arrivée sur l’écran de confirmation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.safe}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark" size={36} color={colors.white} />
        </View>
        <Text style={styles.title}>Commande confirmée</Text>
        <Text style={styles.body}>
          Merci ! Votre plan DôniPay est enregistré. Un SMS de suivi vous sera
          envoyé.
        </Text>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>N° de suivi</Text>
          <Text style={styles.metaValue}>{orderId}</Text>
          <Text style={[styles.metaLabel, { marginTop: 12 }]}>Total</Text>
          <Text style={styles.total}>{formatXof(total)}</Text>
        </View>
      </View>

      <SecondaryButton
        label="Retour à l’accueil"
        onPress={() =>
          navigation.navigate('BuyerTabs', { screen: 'Accueil' })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    justifyContent: 'center',
    gap: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  body: { textAlign: 'center', color: colors.muted, lineHeight: 21 },
  metaBox: {
    width: '100%',
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.bgSoft,
  },
  metaLabel: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  metaValue: { color: colors.ink, fontWeight: '800', fontSize: 18, marginTop: 2 },
  total: { color: colors.accent, fontWeight: '800', fontSize: 20, marginTop: 2 },
});
