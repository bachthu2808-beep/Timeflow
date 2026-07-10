import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculatePay } from '../../payroll/calculatePay';
import { GENERIC_PAY_RULES } from '../../payroll/payRules';
import type { PayResult } from '../../payroll/calculatePay';

type Range = 'today' | 'week' | 'month';

function rangeStart(range: Range): Date {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function PayslipScreen() {
  const { profile } = useAuth();
  const [range, setRange] = useState<Range>('week');
  const [result, setResult] = useState<PayResult | null>(null);

  useEffect(() => {
    if (!profile) return;

    let cancelled = false;

    async function load() {
      const since = rangeStart(range).toISOString();
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', profile!.id)
        .gte('clock_in_at', since);

      if (error || cancelled) return;

      const pay = calculatePay({
        basis: profile!.payBasis,
        hourlyRate: profile!.hourlyRate ?? undefined,
        monthlyRate: profile!.monthlyRate ?? undefined,
        lunchAllowancePerShift: profile!.lunchAllowancePerShift,
        rules: GENERIC_PAY_RULES, // TODO: load the owner's configured PayRuleSet
        shifts: (data ?? []).map((shift) => ({
          clockInMinutes: Math.floor(new Date(shift.clock_in_at).getTime() / 60000),
          clockOutMinutes: shift.clock_out_at ? Math.floor(new Date(shift.clock_out_at).getTime() / 60000) : null,
          paidLunch: shift.paid_lunch,
        })),
      });

      if (!cancelled) setResult(pay);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [profile, range]);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['today', 'week', 'month'] as Range[]).map((r) => (
          <Text
            key={r}
            onPress={() => setRange(r)}
            style={[styles.tab, range === r && styles.tabActive]}
          >
            {r}
          </Text>
        ))}
      </View>

      {result ? (
        <View style={styles.breakdown}>
          <Row label="Regular pay" value={result.regularPay} />
          <Row label="Overtime pay" value={result.overtimePay} />
          <Row label="Lunch allowance" value={result.lunchAllowance} />
          <Row label="Total" value={result.totalPay} bold />
        </View>
      ) : (
        <Text>Loading…</Text>
      )}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={bold ? styles.rowLabelBold : styles.rowLabel}>{label}</Text>
      <Text style={bold ? styles.rowValueBold : styles.rowValue}>${value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24 },
  tabs: { flexDirection: 'row', gap: 12 },
  tab: { textTransform: 'capitalize', color: '#888', paddingBottom: 6 },
  tabActive: { color: '#111', fontWeight: '600', borderBottomWidth: 2, borderBottomColor: '#111' },
  breakdown: { gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#555' },
  rowValue: { color: '#111' },
  rowLabelBold: { fontWeight: '700', fontSize: 18 },
  rowValueBold: { fontWeight: '700', fontSize: 18 },
});
