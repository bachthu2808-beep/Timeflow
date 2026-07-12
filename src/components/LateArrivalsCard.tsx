import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Avatar from './Avatar';
import { formatCurrency } from '../lib/currency';
import { colors, monoFont, radii, shadow, spacing } from '../theme';
import type { LateArrival } from '../payroll/lateArrivals';

interface Props {
  arrivals: LateArrival[];
}

export default function LateArrivalsCard({ arrivals }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('owner.dashboard.lateToday')}</Text>
        {arrivals.length > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('owner.dashboard.flagged', { count: arrivals.length })}</Text>
          </View>
        ) : null}
      </View>

      {arrivals.length === 0 ? (
        <Text style={styles.empty}>{t('owner.dashboard.noLateToday')}</Text>
      ) : (
        arrivals.map((arrival) => (
          <View key={arrival.staffId} style={styles.row}>
            <Avatar id={arrival.staffId} name={arrival.staffName} size={32} />
            <View style={styles.rowBody}>
              <Text style={styles.name}>{arrival.staffName}</Text>
              <Text style={styles.meta}>
                {t('owner.dashboard.clockedInAt', {
                  time: new Date(arrival.clockInMinutes * 60000).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </Text>
            </View>
            <View style={styles.rowValues}>
              <Text style={styles.lateMinutes}>+{arrival.lateMinutes}m</Text>
              {arrival.costImpact !== null ? (
                <Text style={styles.costImpact}>{formatCurrency(-arrival.costImpact)}</Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.md, ...shadow },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  badge: { backgroundColor: colors.statusLateBg, borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: colors.statusLate, fontSize: 12, fontWeight: '700' },
  empty: { color: colors.textMuted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  rowBody: { flex: 1 },
  name: { fontWeight: '700', color: colors.textPrimary, fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12 },
  rowValues: { alignItems: 'flex-end' },
  lateMinutes: { color: colors.statusLate, fontWeight: '700', fontSize: 13, fontFamily: monoFont },
  costImpact: { color: colors.danger, fontSize: 12, fontFamily: monoFont },
});
