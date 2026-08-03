import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import type { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors } from '../../theme/colors';
import { parseProductQr } from '../../utils/qr';

type Props = NativeStackScreenProps<SellerStackParamList, 'ScanQr'>;

export function ScanQrScreen({ navigation, route }: Props) {
  const mode = route.params?.mode ?? 'lookup';
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  if (!permission) {
    return (
      <Screen loading title="Scan QR">
        {null}
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen
        title="Scan QR"
        subtitle="Autorise la caméra pour scanner un produit."
      >
        <PrimaryButton label="Autoriser la caméra" onPress={() => void requestPermission()} />
      </Screen>
    );
  }

  return (
    <View style={styles.wrap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_a'],
        }}
        onBarcodeScanned={
          locked
            ? undefined
            : ({ data }) => {
                setLocked(true);
                const parsed = parseProductQr(data);
                if (mode === 'lookup' && parsed.productId) {
                  navigation.replace('ProductDetail', {
                    productId: parsed.productId,
                  });
                  return;
                }
                navigation.replace('CreateProduct', { scannedCode: data });
              }
        }
      />
      <View style={styles.overlay}>
        <Text style={styles.hint}>
          Cadre le QR DonyPay ou un code-barres produit
        </Text>
        <PrimaryButton
          label="Saisie manuelle"
          variant="secondary"
          onPress={() => navigation.replace('CreateProduct', undefined)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  overlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    gap: 12,
  },
  hint: {
    color: colors.white,
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 12,
    borderRadius: 12,
  },
});
