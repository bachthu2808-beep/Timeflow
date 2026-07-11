import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, monoFont, radii, shadow, spacing } from '../theme';

interface Props {
  label: string;
  value: number;
  caption: string;
  dotColor: string;
}

export default function StatCard({ label, value, caption, dotColor }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
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
  caption: { color: colors.textMuted, fontSize: 13 },
});
