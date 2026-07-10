import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface ActiveStaffRow {
  shiftId: string;
  staffName: string;
  clockInAt: string;
}

export default function OwnerDashboardScreen() {
  const { profile } = useAuth();
  const [activeStaff, setActiveStaff] = useState<ActiveStaffRow[]>([]);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, clock_in_at, profiles(full_name)')
        .eq('status', 'active')
        .eq('profiles.owner_id', profile!.id);

      if (error || !data) return;

      setActiveStaff(
        data.map((row: any) => ({
          shiftId: row.id,
          staffName: row.profiles?.full_name ?? 'Unknown',
          clockInAt: row.clock_in_at,
        }))
      );
    }

    load();

    // Live updates: reflect employee clock-in/out instantly on the owner's dashboard.
    const channel = supabase
      .channel('owner-active-shifts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Who's clocked in</Text>
      <FlatList
        data={activeStaff}
        keyExtractor={(item) => item.shiftId}
        ListEmptyComponent={<Text style={styles.empty}>No one is currently clocked in.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.staffName}</Text>
            <Text style={styles.since}>since {new Date(item.clockInAt).toLocaleTimeString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  empty: { color: '#888', marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontWeight: '600' },
  since: { color: '#888' },
});
