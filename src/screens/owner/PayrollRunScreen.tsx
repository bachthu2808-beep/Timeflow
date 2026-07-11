import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculatePay } from '../../payroll/calculatePay';
import { GENERIC_PAY_RULES } from '../../payroll/payRules';
import { buildPayrollCsv, PayrollCsvRow } from '../../payroll/csv';
import type { PayPeriod } from '../../types';

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff);
}

export default function PayrollRunScreen() {
  const { profile } = useAuth();
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [running, setRunning] = useState(false);

  async function loadPeriods() {
    if (!profile) return;
    const { data, error } = await supabase
      .from('pay_periods')
      .select('*')
      .eq('owner_id', profile.id)
      .order('period_start', { ascending: false });

    if (!error && data) {
      setPeriods(
        data.map((row: any) => ({
          id: row.id,
          ownerId: row.owner_id,
          periodStart: row.period_start,
          periodEnd: row.period_end,
          status: row.status,
        }))
      );
    }
  }

  useEffect(() => {
    loadPeriods();
  }, [profile]);

  async function runPayroll() {
    if (!profile) return;
    setRunning(true);

    try {
      const periodStart = startOfWeek();
      const periodEnd = new Date();

      const { data: staff } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_id', profile.id)
        .eq('role', 'employee');

      if (!staff || staff.length === 0) {
        Alert.alert('No staff', 'Add staff to the roster before running payroll.');
        return;
      }

      const rows: PayrollCsvRow[] = [];

      for (const person of staff) {
        const { data: shifts } = await supabase
          .from('shifts')
          .select('*')
          .eq('staff_id', person.id)
          .gte('clock_in_at', periodStart.toISOString());

        const pay = calculatePay({
          basis: person.pay_basis,
          hourlyRate: person.hourly_rate ?? undefined,
          monthlyRate: person.monthly_rate ?? undefined,
          lunchAllowancePerShift: person.lunch_allowance_per_shift,
          rules: GENERIC_PAY_RULES, // TODO: load the owner's configured PayRuleSet
          shifts: (shifts ?? []).map((s: any) => ({
            clockInMinutes: Math.floor(new Date(s.clock_in_at).getTime() / 60000),
            clockOutMinutes: s.clock_out_at ? Math.floor(new Date(s.clock_out_at).getTime() / 60000) : null,
            paidLunch: s.paid_lunch,
            isHoliday: s.is_holiday,
          })),
        });

        rows.push({
          name: person.full_name,
          regularPay: pay.regularPay,
          overtimePay: pay.overtimePay,
          holidayPay: pay.holidayPay,
          lunchAllowance: pay.lunchAllowance,
          totalPay: pay.totalPay,
        });
      }

      const csv = buildPayrollCsv(rows);
      const fileUri = `${FileSystem.cacheDirectory}payroll-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);

      await supabase.from('pay_periods').insert({
        owner_id: profile.id,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
        status: 'paid',
      });

      await loadPeriods();

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Payroll export' });
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payroll runs</Text>
      <Pressable style={styles.runButton} onPress={runPayroll} disabled={running}>
        <Text style={styles.runButtonText}>{running ? 'Running…' : 'Run payroll & export CSV'}</Text>
      </Pressable>
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
  runButton: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center' },
  runButtonText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#888', marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontWeight: '600' },
  status: { color: '#888', textTransform: 'capitalize' },
});
