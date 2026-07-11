import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ScheduledShift, SwapRequest } from '../../types';

export default function EmployeeScheduleScreen() {
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
    if (error) Alert.alert('Failed', error.message);
    else Alert.alert('Offered', 'Your shift is now open for a coworker to pick up, pending owner approval.');
  }

  async function acceptSwap(swap: SwapRequest) {
    if (!profile) return;
    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'accepted', accepted_by_staff_id: profile.id })
      .eq('id', swap.id);
    if (error) Alert.alert('Failed', error.message);
    else load();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your upcoming shifts</Text>
      <FlatList
        data={schedule}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nothing scheduled yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.time}>
              {new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleTimeString()}
            </Text>
            <Pressable onPress={() => offerSwap(item)}>
              <Text style={styles.offer}>Offer swap</Text>
            </Pressable>
          </View>
        )}
      />

      <Text style={styles.title}>Open swaps from coworkers</Text>
      <FlatList
        data={openSwaps}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No open swaps right now.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>Swap request</Text>
            <Pressable onPress={() => acceptSwap(item)}>
              <Text style={styles.offer}>Accept</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  empty: { color: '#888' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  time: { fontWeight: '600' },
  offer: { color: '#06c', fontWeight: '600' },
});
