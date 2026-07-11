import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { estimateLaborCost } from '../../payroll/laborCost';

interface ActiveStaffRow {
  shiftId: string;
  staffName: string;
  clockInAt: string;
  hourlyRate: number | null;
  mockedLocation: boolean;
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function OwnerDashboardScreen() {
  const { profile } = useAuth();
  const [activeStaff, setActiveStaff] = useState<ActiveStaffRow[]>([]);
  const [laborCostToday, setLaborCostToday] = useState(0);
  const [budget, setBudget] = useState<number | null>(null);

  async function load() {
    if (!profile) return;

    const { data: activeData } = await supabase
      .from('shifts')
      .select('id, clock_in_at, mocked_location, profiles(full_name, hourly_rate)')
      .eq('status', 'active')
      .eq('profiles.owner_id', profile.id);

    if (activeData) {
      setActiveStaff(
        activeData.map((row: any) => ({
          shiftId: row.id,
          staffName: row.profiles?.full_name ?? 'Unknown',
          clockInAt: row.clock_in_at,
          hourlyRate: row.profiles?.hourly_rate ?? null,
          mockedLocation: row.mocked_location,
        }))
      );
    }

    const { data: todayShifts } = await supabase
      .from('shifts')
      .select('clock_in_at, clock_out_at, profiles(hourly_rate, owner_id)')
      .gte('clock_in_at', startOfToday())
      .eq('profiles.owner_id', profile.id);

    if (todayShifts) {
      const nowMinutes = Math.floor(Date.now() / 60000);
      const cost = estimateLaborCost(
        todayShifts.map((row: any) => ({
          hourlyRate: row.profiles?.hourly_rate ?? null,
          clockInMinutes: Math.floor(new Date(row.clock_in_at).getTime() / 60000),
          clockOutMinutes: row.clock_out_at ? Math.floor(new Date(row.clock_out_at).getTime() / 60000) : null,
        })),
        nowMinutes
      );
      setLaborCostToday(cost);
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('daily_labor_budget')
      .eq('owner_id', profile.id)
      .limit(1)
      .maybeSingle();
    setBudget(shop?.daily_labor_budget ?? null);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel('owner-active-shifts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const overBudget = budget !== null && laborCostToday > budget;

  return (
    <View style={styles.container}>
      <View style={[styles.costBanner, overBudget && styles.costBannerAlert]}>
        <Text style={styles.costLabel}>Today's labor cost</Text>
        <Text style={styles.costValue}>${laborCostToday.toFixed(2)}</Text>
        {budget !== null ? (
          <Text style={overBudget ? styles.overBudget : styles.underBudget}>
            {overBudget ? `Over your $${budget.toFixed(2)} budget` : `Budget: $${budget.toFixed(2)}`}
          </Text>
        ) : null}
      </View>

      <Text style={styles.title}>Who's clocked in</Text>
      <FlatList
        data={activeStaff}
        keyExtractor={(item) => item.shiftId}
        ListEmptyComponent={<Text style={styles.empty}>No one is currently clocked in.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>
              {item.staffName} {item.mockedLocation ? '⚠️' : ''}
            </Text>
            <Text style={styles.since}>since {new Date(item.clockInAt).toLocaleTimeString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  costBanner: { backgroundColor: '#f2f2f2', borderRadius: 12, padding: 16 },
  costBannerAlert: { backgroundColor: '#fde2e2' },
  costLabel: { color: '#666' },
  costValue: { fontSize: 28, fontWeight: '700' },
  overBudget: { color: '#c00', fontWeight: '600' },
  underBudget: { color: '#888' },
  title: { fontSize: 22, fontWeight: '700' },
  empty: { color: '#888', marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontWeight: '600' },
  since: { color: '#888' },
});
