import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculatePay } from '../../payroll/calculatePay';
import { GENERIC_PAY_RULES } from '../../payroll/payRules';
import { buildPayslipHtml } from '../../payroll/payslipHtml';
import { formatCurrency } from '../../lib/currency';
import { colors, radii, shadow, spacing } from '../../theme';
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
  const { t } = useTranslation();
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

  async function exportPdf() {
    if (!result || !profile) return;
    const html = buildPayslipHtml({
      staffName: profile.fullName,
      rangeLabel: t(`employee.payslip.range.${range}`),
      result,
      labels: {
        title: t('employee.payslip.title'),
        regularPay: t('employee.payslip.regularPay'),
        overtimePay: t('employee.payslip.overtimePay'),
        holidayPay: t('employee.payslip.holidayPay'),
        lunchAllowance: t('employee.payslip.lunchAllowance'),
        total: t('employee.payslip.total'),
      },
    });
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t('employee.payslip.title') });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['today', 'week', 'month'] as Range[]).map((r) => (
          <Text
            key={r}
            onPress={() => setRange(r)}
            style={[styles.tab, range === r && styles.tabActive]}
          >
            {t(`employee.payslip.range.${r}`)}
          </Text>
        ))}
      </View>

      {result ? (
        <>
          <View style={styles.breakdown}>
            <Row label={t('employee.payslip.regularPay')} value={result.regularPay} />
            <Row label={t('employee.payslip.overtimePay')} value={result.overtimePay} />
            <Row label={t('employee.payslip.holidayPay')} value={result.holidayPay} />
            <Row label={t('employee.payslip.lunchAllowance')} value={result.lunchAllowance} />
            <Row label={t('employee.payslip.total')} value={result.totalPay} bold />
          </View>
          <Pressable style={styles.exportButton} onPress={exportPdf}>
            <Text style={styles.exportButtonText}>{t('employee.payslip.exportPdf')}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.loading}>{t('common.loading')}</Text>
      )}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={bold ? styles.rowLabelBold : styles.rowLabel}>{label}</Text>
      <Text style={bold ? styles.rowValueBold : styles.rowValue}>{formatCurrency(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.xl, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: spacing.lg },
  tab: { textTransform: 'capitalize', color: colors.textMuted, paddingBottom: 6, fontWeight: '600' },
  tabActive: { color: colors.brand, borderBottomWidth: 2, borderBottomColor: colors.brand },
  loading: { color: colors.textMuted },
  breakdown: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, ...shadow },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.textSecondary },
  rowValue: { color: colors.textPrimary, fontFamily: 'monospace' },
  rowLabelBold: { fontWeight: '700', fontSize: 18, color: colors.textPrimary },
  rowValueBold: { fontWeight: '700', fontSize: 18, color: colors.brand, fontFamily: 'monospace' },
  exportButton: { backgroundColor: colors.brand, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center' },
  exportButtonText: { color: '#fff', fontWeight: '700' },
});
