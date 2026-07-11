import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Avatar from '../../components/Avatar';
import SectionLabel from '../../components/SectionLabel';
import { colors, radii, shadow, spacing } from '../../theme';
import type { Profile, ScheduledShift, Shop } from '../../types';

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [schedule, setSchedule] = useState<ScheduledShift[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState(new Date());
  const [endsAt, setEndsAt] = useState(new Date(Date.now() + 4 * 60 * 60 * 1000));
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);

  async function loadAll() {
    if (!profile) return;

    const [{ data: staffData }, { data: shopData }, { data: scheduleData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('owner_id', profile.id).eq('role', 'employee'),
      supabase.from('shops').select('*').eq('owner_id', profile.id),
      supabase
        .from('shift_schedule')
        .select('*')
        .eq('owner_id', profile.id)
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true }),
    ]);

    if (staffData) {
      setStaff(
        staffData.map((row: any) => ({
          id: row.id,
          ownerId: row.owner_id,
          role: row.role,
          fullName: row.full_name,
          jobTitle: row.job_title,
          payBasis: row.pay_basis,
          hourlyRate: row.hourly_rate,
          monthlyRate: row.monthly_rate,
          lunchAllowancePerShift: row.lunch_allowance_per_shift,
          payRuleSetId: row.pay_rule_set_id,
          defaultShopId: row.default_shop_id,
          expoPushToken: row.expo_push_token,
        }))
      );
    }
    if (shopData) {
      setShops(
        shopData.map((row: any) => ({
          id: row.id,
          ownerId: row.owner_id,
          name: row.name,
          latitude: row.latitude,
          longitude: row.longitude,
          geofenceRadiusMeters: row.geofence_radius_meters,
          dailyLaborBudget: row.daily_labor_budget,
          isOpen: row.is_open,
        }))
      );
    }
    if (scheduleData) {
      setSchedule(
        scheduleData.map((row: any) => ({
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
  }

  useEffect(() => {
    loadAll();
  }, [profile]);

  async function handleCreate() {
    if (!profile || !selectedStaffId || !selectedShopId) {
      Alert.alert(t('common.missingInfoTitle'), t('owner.schedule.missingInfoMessage'));
      return;
    }

    const { error } = await supabase.from('shift_schedule').insert({
      owner_id: profile.id,
      shop_id: selectedShopId,
      staff_id: selectedStaffId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    });

    if (error) {
      Alert.alert(t('owner.schedule.failedToAddTitle'), error.message);
      return;
    }

    loadAll();
  }

  return (
    <FlatList
      style={styles.screen}
      data={schedule}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.formCard}>
          <Text style={styles.title}>{t('owner.schedule.buildRota')}</Text>

          <Text style={styles.label}>{t('owner.schedule.staffLabel')}</Text>
          <View style={styles.chipRow}>
            {staff.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSelectedStaffId(s.id)}
                style={[styles.chip, selectedStaffId === s.id && styles.chipSelected]}
              >
                <Text style={selectedStaffId === s.id ? styles.chipTextSelected : styles.chipText}>{s.fullName}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t('owner.schedule.shopLabel')}</Text>
          <View style={styles.chipRow}>
            {shops.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSelectedShopId(s.id)}
                style={[styles.chip, selectedShopId === s.id && styles.chipSelected]}
              >
                <Text style={selectedShopId === s.id ? styles.chipTextSelected : styles.chipText}>{s.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.timeRow}>
            <Pressable style={styles.timeButton} onPress={() => setPickerTarget('start')}>
              <Text style={styles.label}>{t('owner.schedule.startLabel')}</Text>
              <Text style={styles.timeValue}>{startsAt.toLocaleString()}</Text>
            </Pressable>
            <Pressable style={styles.timeButton} onPress={() => setPickerTarget('end')}>
              <Text style={styles.label}>{t('owner.schedule.endLabel')}</Text>
              <Text style={styles.timeValue}>{endsAt.toLocaleString()}</Text>
            </Pressable>
          </View>

          {pickerTarget ? (
            <DateTimePicker
              value={pickerTarget === 'start' ? startsAt : endsAt}
              mode="datetime"
              onChange={(_event, date) => {
                if (date) {
                  pickerTarget === 'start' ? setStartsAt(date) : setEndsAt(date);
                }
                setPickerTarget(null);
              }}
            />
          ) : null}

          <Pressable style={styles.addButton} onPress={handleCreate}>
            <Text style={styles.addButtonText}>{t('owner.schedule.addToRota')}</Text>
          </Pressable>

          <SectionLabel>{t('owner.schedule.upcoming')}</SectionLabel>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>{t('owner.schedule.nothingScheduled')}</Text>}
      renderItem={({ item }) => {
        const s = staff.find((st) => st.id === item.staffId);
        return (
          <View style={styles.row}>
            <Avatar id={item.staffId} name={s?.fullName ?? '?'} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s?.fullName ?? t('common.unknown')}</Text>
              <Text style={styles.since}>
                {new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.xs },
  formCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.md, ...shadow },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  label: { color: colors.textMuted, fontSize: 12 },
  timeValue: { color: colors.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  chipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textPrimary },
  chipTextSelected: { color: '#fff' },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  timeButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md },
  addButton: { backgroundColor: colors.brand, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '700' },
  empty: { color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.xs, ...shadow },
  name: { fontWeight: '700', color: colors.textPrimary },
  since: { color: colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
});
