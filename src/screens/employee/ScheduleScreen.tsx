import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import SectionLabel from '../../components/SectionLabel';
import { colors, radii, shadow, spacing } from '../../theme';
import type { ScheduledShift, SwapRequest } from '../../types';

export default function EmployeeScheduleScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [schedule, setSchedule] = useState<ScheduledShift[]>([]);
  const [openSwaps, setOpenSwaps] = useState<SwapRequest[]>([]);

  async function load() {
    if (!profile) return;

    const { data: mine } = await supabase
      .from('shift_schedule')
      .select('*')
      .eq('staff_id', profile.id)
      .eq('status', 'scheduled')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true });

    if (mine) {
      setSchedule(
        mine.map((row: any) => ({
          id: row.id,
          ownerId: row.owner_id,
          shopId: row.shop_id,
          staffId: row.staff_id,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          status: row.status,
        }))
      );
    }

    const { data: swaps } = await supabase
      .from('swap_requests')
      .select('*')
      .eq('status', 'open')
      .neq('requesting_staff_id', profile.id);

    if (swaps) {
      setOpenSwaps(
        swaps.map((row: any) => ({
          id: row.id,
          scheduleId: row.schedule_id,
          ownerId: row.owner_id,
          requestingStaffId: row.requesting_staff_id,
          targetStaffId: row.target_staff_id,
          acceptedByStaffId: row.accepted_by_staff_id,
          status: row.status,
          createdAt: row.created_at,
        }))
      );
    }
  }

  useEffect(() => {
    load();
    if (!profile) return;
    const channel = supabase
      .channel('employee-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function offerSwap(scheduleShift: ScheduledShift) {
    if (!profile) return;
    const { error } = await supabase.from('swap_requests').insert({
      schedule_id: scheduleShift.id,
      owner_id: scheduleShift.ownerId,
      requesting_staff_id: profile.id,
    });
    if (error) Alert.alert(t('common.failedTitle'), error.message);
    else Alert.alert(t('employee.schedule.offeredTitle'), t('employee.schedule.offeredMessage'));
  }

  async function acceptSwap(swap: SwapRequest) {
    if (!profile) return;
    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'accepted', accepted_by_staff_id: profile.id })
      .eq('id', swap.id);
    if (error) Alert.alert(t('common.failedTitle'), error.message);
    else load();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <SectionLabel>{t('employee.schedule.upcomingShifts')}</SectionLabel>
      {schedule.length === 0 ? (
        <Text style={styles.empty}>{t('owner.schedule.nothingScheduled')}</Text>
      ) : (
        schedule.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.time}>
              {new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleTimeString()}
            </Text>
            <Pressable onPress={() => offerSwap(item)}>
              <Text style={styles.offer}>{t('employee.schedule.offerSwap')}</Text>
            </Pressable>
          </View>
        ))
      )}

      <SectionLabel>{t('employee.schedule.openSwaps')}</SectionLabel>
      {openSwaps.length === 0 ? (
        <Text style={styles.empty}>{t('employee.schedule.noOpenSwaps')}</Text>
      ) : (
        openSwaps.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={{ color: colors.textPrimary }}>{t('employee.schedule.swapRequest')}</Text>
            <Pressable onPress={() => acceptSwap(item)}>
              <Text style={styles.offer}>{t('common.accept')}</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.sm },
  empty: { color: colors.textMuted, marginBottom: spacing.md },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  time: { fontWeight: '700', color: colors.textPrimary, fontFamily: 'monospace' },
  offer: { color: colors.link, fontWeight: '700' },
});
