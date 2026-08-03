import React from 'react';
import { Image, StyleSheet, Text, View, type ImageStyle } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  /** `mark` = icône seule · `full` = icône + wordmark + tagline */
  variant?: 'mark' | 'full';
  height?: number;
  showTaglineFallback?: boolean;
  style?: ImageStyle;
};

const markSource = require('../../assets/brand/logo-mark.png');
const fullSource = require('../../assets/brand/logo-full.png');

export function BrandLogo({
  variant = 'full',
  height = 48,
  showTaglineFallback = false,
  style,
}: Props) {
  if (variant === 'mark') {
    return (
      <Image
        source={markSource}
        style={[{ width: height, height }, style]}
        resizeMode="contain"
        accessibilityLabel="DôniPay"
      />
    );
  }

  const width = Math.round(height * (920 / 220));

  return (
    <View style={styles.wrap}>
      <Image
        source={fullSource}
        style={[{ width, height }, style]}
        resizeMode="contain"
        accessibilityLabel="DôniPay — Paiement flexible"
      />
      {showTaglineFallback ? (
        <Text style={styles.fallback}>PAIEMENT FLEXIBLE</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  fallback: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
});
