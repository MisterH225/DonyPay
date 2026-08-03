import React, { useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { createProduct, getProduct } from '../../api/catalog';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { useShop } from '../../context/ShopContext';
import type { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors } from '../../theme/colors';
import { parseProductQr } from '../../utils/qr';

type Props = NativeStackScreenProps<SellerStackParamList, 'CreateProduct'>;

export function CreateProductScreen({ navigation, route }: Props) {
  const { shop } = useShop();
  const scanned = route.params?.scannedCode;
  const [name, setName] = useState(scanned && !parseProductQr(scanned).productId ? scanned : '');
  const [price, setPrice] = useState('');
  const [photo, setPhoto] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!scanned) return;
    const parsed = parseProductQr(scanned);
    if (!parsed.productId) {
      setName(scanned);
      return;
    }
    void (async () => {
      try {
        const existing = await getProduct(parsed.productId!);
        Alert.alert(
          'Produit déjà catalogue',
          `« ${existing.name} » existe. Ouvrir la fiche ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Ouvrir',
              onPress: () =>
                navigation.replace('ProductDetail', { productId: existing.id }),
            },
          ],
        );
      } catch {
        setName(parsed.productId ?? scanned);
      }
    })();
  }, [scanned, navigation]);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission', 'Autorise l’accès photos pour ajouter une image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? `product-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
  }

  async function onSubmit() {
    setError(null);
    if (!shop) {
      setError('Crée d’abord ta boutique.');
      return;
    }
    const amount = Number(price.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(amount) || amount < 0.01) {
      setError('Nom et prix (> 0) requis.');
      return;
    }
    setLoading(true);
    try {
      const product = await createProduct(
        shop.id,
        { name: name.trim(), price: amount },
        photo ?? undefined,
      );
      navigation.replace('ProductDetail', { productId: product.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="Nouveau produit"
      subtitle="Saisie manuelle ou scan QR / code-barres pour préremplir."
    >
      <PrimaryButton
        label="Scanner un QR / code-barres"
        variant="secondary"
        onPress={() => navigation.navigate('ScanQr', { mode: 'create' })}
      />

      <Text style={styles.label}>Nom</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="iPhone 15 128 Go"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>Prix (XOF)</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="250000"
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.label}>Photo (optionnel)</Text>
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.preview} />
      ) : null}
      <PrimaryButton
        label={photo ? 'Changer la photo' : 'Ajouter une photo'}
        variant="secondary"
        onPress={() => void pickPhoto()}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label="Publier le produit"
        onPress={() => void onSubmit()}
        loading={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: colors.bgWarm,
  },
  error: { color: colors.danger, fontWeight: '600' },
});
