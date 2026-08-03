import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { useShop } from '../../context/ShopContext';
import type { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<SellerStackParamList, 'CreateShop'>;

export function CreateShopScreen({ navigation }: Props) {
  const { ensureShop, refresh } = useShop();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!name.trim()) {
      setError('Nom de boutique requis.');
      return;
    }
    setLoading(true);
    try {
      await ensureShop({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      await refresh();
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="Ma boutique"
      subtitle="Crée ta boutique vendeur pour publier des produits."
    >
      <Text style={styles.label}>Nom</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Boutique Koné"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.label}>Description (optionnel)</Text>
      <TextInput
        style={[styles.input, styles.area]}
        value={description}
        onChangeText={setDescription}
        placeholder="Électronique & accessoires"
        placeholderTextColor={colors.muted}
        multiline
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Créer la boutique"
        onPress={() => void onSubmit()}
        loading={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  area: { minHeight: 90, textAlignVertical: 'top' },
  error: { color: colors.danger, fontWeight: '600' },
});
