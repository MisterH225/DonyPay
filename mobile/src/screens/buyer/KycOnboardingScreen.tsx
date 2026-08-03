import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import {
  getKycStatus,
  uploadIdentityDocument,
  uploadSelfieDocument,
} from '../../api/identity';
import type { KycStatus } from '../../api/types';
import { useSession } from '../../context/SessionContext';
import { colors } from '../../theme/colors';

type LocalAsset = { uri: string; name: string; type: string };

async function pickImage(asSelfie: boolean): Promise<LocalAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission requise', 'Autorise l’accès aux photos pour continuer.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
    aspect: asSelfie ? [1, 1] : [3, 4],
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const name =
    asset.fileName ??
    (asSelfie ? `selfie-${Date.now()}.jpg` : `piece-${Date.now()}.jpg`);
  return {
    uri: asset.uri,
    name,
    type: asset.mimeType ?? 'image/jpeg',
  };
}

export function KycOnboardingScreen() {
  const { userId, loading: sessionLoading } = useSession();
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'piece' | 'selfie' | null>(null);
  const [piecePreview, setPiecePreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setStatus(await getKycStatus(userId));
    } catch (err) {
      Alert.alert('KYC', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onUploadPiece = async () => {
    if (!userId) return;
    const file = await pickImage(false);
    if (!file) return;
    setUploading('piece');
    try {
      await uploadIdentityDocument(userId, file);
      setPiecePreview(file.uri);
      await refresh();
    } catch (err) {
      Alert.alert('Upload', err instanceof Error ? err.message : 'Échec');
    } finally {
      setUploading(null);
    }
  };

  const onUploadSelfie = async () => {
    if (!userId) return;
    const file = await pickImage(true);
    if (!file) return;
    setUploading('selfie');
    try {
      await uploadSelfieDocument(userId, file);
      setSelfiePreview(file.uri);
      await refresh();
    } catch (err) {
      Alert.alert('Upload', err instanceof Error ? err.message : 'Échec');
    } finally {
      setUploading(null);
    }
  };

  const hasIdentity = status?.documents.some((d) => d.type === 'identity_document');
  const hasSelfie = status?.documents.some((d) => d.type === 'proof_of_address');

  return (
    <Screen
      title="Onboarding KYC"
      subtitle="Envoie ta pièce d’identité et un selfie pour vérifier ton compte."
      loading={sessionLoading || loading}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeLabel}>Statut</Text>
        <Text style={styles.badgeValue}>{status?.status ?? '—'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Pièce d’identité</Text>
        <Text style={styles.cardBody}>
          Carte nationale, passeport ou permis (photo lisible).
        </Text>
        {piecePreview ? (
          <Image source={{ uri: piecePreview }} style={styles.preview} />
        ) : null}
        <PrimaryButton
          label={hasIdentity ? 'Remplacer la pièce' : 'Choisir une pièce'}
          onPress={() => void onUploadPiece()}
          loading={uploading === 'piece'}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Selfie de vérification</Text>
        <Text style={styles.cardBody}>
          Visage bien éclairé, sans lunettes opaques.
        </Text>
        {selfiePreview ? (
          <Image source={{ uri: selfiePreview }} style={styles.previewRound} />
        ) : null}
        <PrimaryButton
          label={hasSelfie ? 'Remplacer le selfie' : 'Prendre / choisir un selfie'}
          onPress={() => void onUploadSelfie()}
          loading={uploading === 'selfie'}
          variant="secondary"
        />
      </View>

      {hasIdentity && hasSelfie ? (
        <Text style={styles.done}>
          Dossier reçu. Tu peux créer un objectif d’épargne.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  badgeLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  badgeValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  cardBody: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.bgWarm,
  },
  previewRound: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: 'center',
    backgroundColor: colors.bgWarm,
  },
  done: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
});
