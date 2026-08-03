import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  scroll?: boolean;
  style?: ViewStyle;
  headerRight?: React.ReactNode;
};

export function Screen({
  title,
  subtitle,
  children,
  loading,
  scroll = true,
  style,
  headerRight,
}: Props) {
  const body = loading ? (
    <View style={styles.loadingBox}>
      <ActivityIndicator color={colors.ink} />
    </View>
  ) : (
    children
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={[styles.container, style]}>
        {(title || headerRight) && (
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {headerRight}
          </View>
        )}
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  headerText: { flex: 1, gap: 4 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: 'Georgia',
  },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  scroll: { paddingBottom: 40, gap: 14 },
  loadingBox: { paddingVertical: 48, alignItems: 'center' },
});
