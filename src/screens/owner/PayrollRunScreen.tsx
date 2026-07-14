import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { notify } from '../../lib/notify';
import { calculatePay } from '../../payroll/calculatePay';
import { GENERIC_PAY_RULES } from '../../payroll/payRules';
import { buildPayrollCsv, PayrollCsvRow } from '../../payroll/csv';
import { formatCurrency } from '../../lib/currency';
import Avatar from '../../components/Avatar';
import { colors, radii, shadow, spacing } from '../../theme';

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff);
}

interface StaffPayRow {
  id: string;
  name: string;
  shiftCount: number;
  hours: number;
  totalPay: number;
}

export default function PayrollRunScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [rows, setRows] = useState<StaffPayRow[]>([]);
  const [running, setRunning] = useState(false);

  async function loadPreview() {
    if (!profile) return;
    const periodStart = startOfWeek();

    const { data: staff } = await supabase.from('profiles').select('*').eq('owner_id', profile.id).eq('role', 'employee');
    if (!staff) return;

    const nowMinutes = Math.floor(Date.now() / 60000);
    const preview: StaffPayRow[] = [];

    for (const person of staff) {
      const { data: shifts } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', person.id)
        .gte('clock_in_at', periodStart.toISOString());

      const shiftList = (shifts ?? []).map((s: any) => ({
        clockInMinutes: Math.floor(new Date(s.clock_in_at).getTime() / 60000),
        clockOutMinutes: s.clock_out_at ? Math.floor(new Date(s.clock_out_at).getTime() / 60000) : null,
        paidLunch: s.paid_lunch,
        isHoliday: s.is_holiday,
      }));

      const pay = calculatePay({
        basis: person.pay_basis,
        hourlyRate: person.hourly_rate ?? undefined,
        monthlyRate: person.monthly_rate ?? undefined,
        lunchAllowancePerShift: person.lunch_allowance_per_shift,
        rules: GENERIC_PAY_RULES, // TODO: load the owner's configured PayRuleSet
        nowMinutes,
        shifts: shiftList,
      });

      preview.push({
        id: person.id,
        name: person.full_name,
        shiftCount: shifts?.length ?? 0,
        hours: Math.round((pay.regularMinutes + pay.overtimeMinutes + pay.holidayMinutes) / 60),
        totalPay: pay.totalPay,
      });
    }

    preview.sort((a, b) => b.totalPay - a.totalPay);
    setRows(preview);
  }

  useEffect(() => {
    loadPreview();
    if (!profile) return;
    const channel = supabase
      .channel('owner-payroll-preview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, loadPreview)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function exportPayroll() {
    if (!profile) return;
    setRunning(true);

    try {
      if (rows.length === 0) {
        notify(t('owner.payroll.noStaffTitle'), t('owner.payroll.noStaffMessage'));
        return;
      }

      const csvRows: PayrollCsvRow[] = [];
      const periodStart = startOfWeek();

      for (const row of rows) {
        const { data: person } = await supabase.from('profiles').select('*').eq('id', row.id).single();
        const { data: shifts } = await supabase
          .from('shifts')
          .select('*')
          .eq('staff_id', row.id)
          .gte('clock_in_at', periodStart.toISOString());

        const pay = calculatePay({
          basis: person.pay_basis,
          hourlyRate: person.hourly_rate ?? undefined,
          monthlyRate: person.monthly_rate ?? undefined,
          lunchAllowancePerShift: person.lunch_allowance_per_shift,
          rules: GENERIC_PAY_RULES,
          shifts: (shifts ?? []).map((s: any) => ({
            clockInMinutes: Math.floor(new Date(s.clock_in_at).getTime() / 60000),
            clockOutMinutes: s.clock_out_at ? Math.floor(new Date(s.clock_out_at).getTime() / 60000) : null,
            paidLunch: s.paid_lunch,
            isHoliday: s.is_holiday,
          })),
        });

        csvRows.push({
          name: row.name,
          regularPay: pay.regularPay,
          overtimePay: pay.overtimePay,
          holidayPay: pay.holidayPay,
          lunchAllowance: pay.lunchAllowance,
          totalPay: pay.totalPay,
        });
      }

      const csv = buildPayrollCsv(csvRows);
      const fileUri = `${FileSystem.cacheDirectory}payroll-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);

      await supabase.from('pay_periods').insert({
        owner_id: profile.id,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: new Date().toISOString().slice(0, 10),
        status: 'paid',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: t('owner.payroll.exportDialogTitle') });
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>{t('owner.payroll.noStaffYet')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Avatar id={item.id} name={item.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {t('owner.payroll.shiftsAndHours', { count: item.shiftCount, shifts: item.shiftCount, hours: item.hours })}
              </Text>
            </View>
            <Text style={styles.amount}>{formatCurrency(item.totalPay)}</Text>
          </View>
        )}
      />
      <Pressable style={styles.exportButton} onPress={exportPayroll} disabled={running}>
        <Text style={styles.exportButtonText}>{running ? t('owner.payroll.running') : t('owner.payroll.exportButton')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  empty: { color: colors.textMuted, marginTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, ...shadow },
  name: { fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
  amount: { fontWeight: '800', color: colors.textPrimary, fontFamily: 'monospace', fontSize: 15 },
  exportButton: { backgroundColor: colors.statusPresent, borderRadius: radii.pill, padding: spacing.md, alignItems: 'center', margin: spacing.lg, ...shadow },
  exportButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
