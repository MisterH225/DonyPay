import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../components/BrandLogo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { RoleToggle } from '../../components/RoleToggle';
import type { BuyerStackParamList } from '../../navigation/BuyerNavigator';
import { colors } from '../../theme/colors';

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();

  return (
    <SafeAreaView style={styles.safe}>
      <BrandLogo variant="mark" height={64} />
      <Text style={styles.title}>Profil</Text>
      <Text style={styles.body}>Awa Koné · acheteur@donypay.demo</Text>
      <View style={styles.actions}>
        <PrimaryButton
          label="Vérification KYC"
          variant="secondary"
          onPress={() => navigation.navigate('KycOnboarding')}
        />
        <PrimaryButton
          label="Historique"
          variant="secondary"
          onPress={() => navigation.navigate('Historique')}
        />
      </View>
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
  actions: { gap: 10, marginTop: 8 },
  toggle: { marginTop: 12 },
});
