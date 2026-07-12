import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, monoFont, radii, shadow, spacing } from '../theme';

interface Props {
  label: string;
  value: number;
  caption: string;
  dotColor: string;
  onPress?: () => void;
}

export default function StatCard({ label, value, caption, dotColor, onPress }: Props) {
  const { t } = useTranslation();

  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.footerRow}>
        <Text style={styles.caption}>{caption}</Text>
        {onPress ? <Text style={styles.view}>{t('owner.dashboard.view')} →</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: { fontSize: 34, fontWeight: '800', color: colors.textPrimary, fontFamily: monoFont },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { color: colors.textMuted, fontSize: 13 },
  view: { color: colors.link, fontSize: 12, fontWeight: '700' },
});
