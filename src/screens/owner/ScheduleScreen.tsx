import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile, ScheduledShift, Shop } from '../../types';

export default function ScheduleScreen() {
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
      Alert.alert('Missing info', 'Pick a staff member and a shop first.');
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
      Alert.alert('Failed to add shift', error.message);
      return;
    }

    loadAll();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Build the rota</Text>

      <Text style={styles.label}>Staff</Text>
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

      <Text style={styles.label}>Shop</Text>
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
          <Text style={styles.label}>Start</Text>
          <Text>{startsAt.toLocaleString()}</Text>
        </Pressable>
        <Pressable style={styles.timeButton} onPress={() => setPickerTarget('end')}>
          <Text style={styles.label}>End</Text>
          <Text>{endsAt.toLocaleString()}</Text>
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
        <Text style={styles.addButtonText}>Add to rota</Text>
      </Pressable>

      <Text style={styles.title}>Upcoming</Text>
      <FlatList
        data={schedule}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nothing scheduled yet.</Text>}
        renderItem={({ item }) => {
          const s = staff.find((st) => st.id === item.staffId);
          return (
            <View style={styles.row}>
              <Text style={styles.name}>{s?.fullName ?? 'Unknown'}</Text>
              <Text style={styles.since}>
                {new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleTimeString()}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  label: { color: '#888', fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipSelected: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#111' },
  chipTextSelected: { color: '#fff' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeButton: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  addButton: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#888' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontWeight: '600' },
  since: { color: '#888' },
});
