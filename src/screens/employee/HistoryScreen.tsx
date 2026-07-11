import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, radii, shadow, spacing } from '../../theme';
import type { ShiftRecord } from '../../types';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', profile.id)
      .order('clock_in_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error || !data) return;
        setShifts(
          data.map((row: any) => ({
            id: row.id,
            staffId: row.staff_id,
            shopId: row.shop_id,
            clockInAt: row.clock_in_at,
            clockOutAt: row.clock_out_at,
            paidLunch: row.paid_lunch,
            isHoliday: row.is_holiday,
            status: row.status,
            mockedLocation: row.mocked_location,
            clockInPhotoUrl: row.clock_in_photo_url,
          }))
        );
      });
  }, [profile]);

  return (
    <FlatList
      style={styles.screen}
      data={shifts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={<Text style={styles.title}>{t('employee.history.title')}</Text>}
      ListEmptyComponent={<Text style={styles.empty}>{t('employee.history.noShiftsYet')}</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.date}>{new Date(item.clockInAt).toLocaleDateString()}</Text>
          <Text style={styles.time}>
            {new Date(item.clockInAt).toLocaleTimeString()} –{' '}
            {item.clockOutAt ? new Date(item.clockOutAt).toLocaleTimeString() : t('employee.history.active')}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.xs },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm },
  empty: { color: colors.textMuted },
  card: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.xs, ...shadow },
  date: { fontWeight: '700', color: colors.textPrimary },
  time: { color: colors.textMuted, fontFamily: 'monospace', fontSize: 13 },
});
