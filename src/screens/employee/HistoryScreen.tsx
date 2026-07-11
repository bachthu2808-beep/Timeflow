import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ShiftRecord } from '../../types';

export default function HistoryScreen() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Attendance history</Text>
      <FlatList
        data={shifts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No shifts yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.date}>{new Date(item.clockInAt).toLocaleDateString()}</Text>
            <Text style={styles.time}>
              {new Date(item.clockInAt).toLocaleTimeString()} –{' '}
              {item.clockOutAt ? new Date(item.clockOutAt).toLocaleTimeString() : 'active'}
            </Text>
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
  date: { fontWeight: '600' },
  time: { color: '#888' },
});
