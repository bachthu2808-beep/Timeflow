import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { PayPeriod } from '../../types';

export default function PayrollRunScreen() {
  const { profile } = useAuth();
  const [periods, setPeriods] = useState<PayPeriod[]>([]);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from('pay_periods')
      .select('*')
      .eq('owner_id', profile.id)
      .order('period_start', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return;
        setPeriods(
          data.map((row: any) => ({
            id: row.id,
            ownerId: row.owner_id,
            periodStart: row.period_start,
            periodEnd: row.period_end,
            status: row.status,
          }))
        );
      });
  }, [profile]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payroll runs</Text>
      {/* TODO: "Run payroll" button that sums calculatePay() across all staff for the period
          and writes a pay_periods row with status 'processing' -> 'paid'. */}
      <FlatList
        data={periods}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No payroll runs yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>
              {new Date(item.periodStart).toLocaleDateString()} – {new Date(item.periodEnd).toLocaleDateString()}
            </Text>
            <Text style={styles.status}>{item.status}</Text>
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
  status: { color: '#888', textTransform: 'capitalize' },
});
