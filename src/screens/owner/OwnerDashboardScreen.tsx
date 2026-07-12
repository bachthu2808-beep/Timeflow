import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { estimateLaborCost } from '../../payroll/laborCost';
import { computeMonthlyLaborCost } from '../../payroll/monthlyLaborCost';
import { computeAttendanceSummary } from '../../payroll/attendance';
import { computeLateArrivals, LateArrival } from '../../payroll/lateArrivals';
import { formatCurrency } from '../../lib/currency';
import StatCard from '../../components/StatCard';
import MonthlyBarChart from '../../components/MonthlyBarChart';
import LateArrivalsCard from '../../components/LateArrivalsCard';
import Avatar from '../../components/Avatar';
import SectionLabel from '../../components/SectionLabel';
import { usePendingApprovalsCount } from '../../hooks/usePendingApprovalsCount';
import { colors, radii, shadow, spacing } from '../../theme';

interface ActiveStaffRow {
  shiftId: string;
  staffId: string;
  staffName: string;
  jobTitle: string | null;
  clockInAt: string;
  hourlyRate: number | null;
  mockedLocation: boolean;
  status: 'present' | 'late' | 'absent' | 'on_leave';
}

function startOfDay(offsetDays = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export default function OwnerDashboardScreen() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [shopName, setShopName] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [staffCount, setStaffCount] = useState(0);
  const [activeStaff, setActiveStaff] = useState<ActiveStaffRow[]>([]);
  const [laborCostToday, setLaborCostToday] = useState(0);
  const [shiftsLoggedToday, setShiftsLoggedToday] = useState(0);
  const [dailyBudget, setDailyBudget] = useState<number | null>(null);
  const [monthlyCosts, setMonthlyCosts] = useState<number[]>([]);
  const [lateArrivals, setLateArrivals] = useState<LateArrival[]>([]);
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0, onLeave: 0 });
  const pendingCount = usePendingApprovalsCount();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    if (!profile) return;

    const { data: shop } = await supabase
      .from('shops')
      .select('id, name, daily_labor_budget, is_open')
      .eq('owner_id', profile.id)
      .limit(1)
      .maybeSingle();
    if (shop) {
      setShopName(shop.name);
      setIsOpen(shop.is_open);
      setShopId(shop.id);
      setDailyBudget(shop.daily_labor_budget ?? null);
    }

    const { count: staffTotal } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', profile.id)
      .eq('role', 'employee');
    setStaffCount(staffTotal ?? 0);

    const { data: activeData } = await supabase
      .from('shifts')
      .select('id, staff_id, clock_in_at, mocked_location, profiles(full_name, job_title, hourly_rate, owner_id)')
      .eq('status', 'active')
      .eq('profiles.owner_id', profile.id);

    const { data: todayShifts } = await supabase
      .from('shifts')
      .select('clock_in_at, clock_out_at, staff_id, profiles(full_name, job_title, hourly_rate, owner_id)')
      .gte('clock_in_at', startOfDay().toISOString())
      .eq('profiles.owner_id', profile.id);

    const { data: todaySchedule } = await supabase
      .from('shift_schedule')
      .select('staff_id, starts_at')
      .eq('owner_id', profile.id)
      .gte('starts_at', startOfDay().toISOString())
      .lt('starts_at', startOfDay(1).toISOString());

    const { data: approvedLeave } = await supabase
      .from('approval_requests')
      .select('staff_id')
      .eq('owner_id', profile.id)
      .eq('kind', 'time_off')
      .eq('status', 'approved')
      .lte('requested_start', new Date().toISOString())
      .gte('requested_end', new Date().toISOString());

    const nowMinutes = Math.floor(Date.now() / 60000);

    const summary = computeAttendanceSummary(
      (todaySchedule ?? []).map((row: any) => ({
        staffId: row.staff_id,
        scheduledStartMinutes: Math.floor(new Date(row.starts_at).getTime() / 60000),
      })),
      (todayShifts ?? []).map((row: any) => ({
        staffId: row.staff_id,
        clockInMinutes: Math.floor(new Date(row.clock_in_at).getTime() / 60000),
      })),
      (approvedLeave ?? []).map((row: any) => row.staff_id),
      5
    );
    setAttendance({ present: summary.present, absent: summary.absent, late: summary.late, onLeave: summary.onLeave });

    if (activeData) {
      setActiveStaff(
        activeData.map((row: any) => ({
          shiftId: row.id,
          staffId: row.staff_id,
          staffName: row.profiles?.full_name ?? t('common.unknown'),
          jobTitle: row.profiles?.job_title ?? null,
          clockInAt: row.clock_in_at,
          hourlyRate: row.profiles?.hourly_rate ?? null,
          mockedLocation: row.mocked_location,
          status: summary.statusByStaffId[row.staff_id] === 'late' ? 'late' : 'present',
        }))
      );
    }

    if (todayShifts) {
      setShiftsLoggedToday(todayShifts.length);
      const cost = estimateLaborCost(
        todayShifts.map((row: any) => ({
          hourlyRate: row.profiles?.hourly_rate ?? null,
          clockInMinutes: Math.floor(new Date(row.clock_in_at).getTime() / 60000),
          clockOutMinutes: row.clock_out_at ? Math.floor(new Date(row.clock_out_at).getTime() / 60000) : null,
        })),
        nowMinutes
      );
      setLaborCostToday(cost);

      const earliestClockInByStaff = new Map<
        string,
        { minutes: number; hourlyRate: number | null; staffName: string; jobTitle: string | null }
      >();
      for (const row of todayShifts as any[]) {
        const minutes = Math.floor(new Date(row.clock_in_at).getTime() / 60000);
        const existing = earliestClockInByStaff.get(row.staff_id);
        if (!existing || minutes < existing.minutes) {
          earliestClockInByStaff.set(row.staff_id, {
            minutes,
            hourlyRate: row.profiles?.hourly_rate ?? null,
            staffName: row.profiles?.full_name ?? t('common.unknown'),
            jobTitle: row.profiles?.job_title ?? null,
          });
        }
      }
      const lateInputs = (todaySchedule ?? []).flatMap((schedRow: any) => {
        const clock = earliestClockInByStaff.get(schedRow.staff_id);
        if (!clock) return [];
        return [
          {
            staffId: schedRow.staff_id,
            staffName: clock.staffName,
            jobTitle: clock.jobTitle,
            clockInMinutes: clock.minutes,
            scheduledStartMinutes: Math.floor(new Date(schedRow.starts_at).getTime() / 60000),
            hourlyRate: clock.hourlyRate,
          },
        ];
      });
      setLateArrivals(computeLateArrivals(lateInputs, 5));
    }

    const monthStart = startOfMonth();
    const elapsedDays = now.getDate();
    const { data: monthShifts } = await supabase
      .from('shifts')
      .select('clock_in_at, clock_out_at, profiles(hourly_rate, owner_id)')
      .gte('clock_in_at', monthStart.toISOString())
      .eq('profiles.owner_id', profile.id);

    if (monthShifts) {
      setMonthlyCosts(
        computeMonthlyLaborCost(
          monthShifts.map((row: any) => ({
            hourlyRate: row.profiles?.hourly_rate ?? null,
            clockInMinutes: Math.floor(new Date(row.clock_in_at).getTime() / 60000),
            clockOutMinutes: row.clock_out_at ? Math.floor(new Date(row.clock_out_at).getTime() / 60000) : null,
          })),
          monthStart,
          elapsedDays,
          nowMinutes
        )
      );
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel('owner-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function toggleOpen(next: boolean) {
    setIsOpen(next);
    if (shopId) {
      await supabase.from('shops').update({ is_open: next }).eq('id', shopId);
    }
  }

  const hour = now.getHours();
  const greeting =
    hour < 12 ? t('owner.dashboard.goodMorning') : hour < 18 ? t('owner.dashboard.goodAfternoon') : t('owner.dashboard.goodEvening');
  const budgetPercent = dailyBudget && dailyBudget > 0 ? Math.round((laborCostToday / dailyBudget) * 100) : null;
  const monthlyBudget = dailyBudget ? dailyBudget * daysInMonth(now) : null;
  const monthToDateCost = monthlyCosts.reduce((a, b) => a + b, 0);
  const monthlyBudgetPercent = monthlyBudget && monthlyBudget > 0 ? Math.round((monthToDateCost / monthlyBudget) * 100) : null;
  const dateLine = now.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
  const liveTime = now.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  return (
    <FlatList
      style={styles.screen}
      data={activeStaff}
      keyExtractor={(item) => item.shiftId}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Avatar id={profile?.id ?? ''} name={profile?.fullName ?? ''} size={44} />
              <View>
                <Text style={styles.greeting}>{greeting}, {profile?.fullName?.split(' ').pop()}</Text>
                <Text style={styles.shopName}>{shopName}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.openPill}>
                <View style={[styles.openDot, { backgroundColor: isOpen ? colors.statusPresent : colors.statusAbsent }]} />
                <Text style={styles.openPillText}>{isOpen ? t('owner.dashboard.storeOpen') : t('owner.dashboard.storeClosed')}</Text>
                <Switch value={isOpen} onValueChange={toggleOpen} trackColor={{ true: colors.brand }} />
              </View>
            </View>
          </View>

          <View style={styles.statusBar}>
            <Text style={styles.dateText}>{dateLine} · {shopName}</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>{t('owner.dashboard.live')} · {liveTime}</Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <StatCard
                label={t('owner.dashboard.present')}
                value={attendance.present}
                caption={t('owner.dashboard.ofStaff', { count: staffCount })}
                dotColor={colors.statusPresent}
                onPress={() => navigation.navigate('Roster')}
              />
              <StatCard
                label={t('owner.dashboard.absent')}
                value={attendance.absent}
                caption={t('owner.dashboard.unplanned')}
                dotColor={colors.statusAbsent}
                onPress={() => navigation.navigate('Roster')}
              />
            </View>
            <View style={styles.statRow}>
              <StatCard
                label={t('owner.dashboard.late')}
                value={attendance.late}
                caption={t('owner.dashboard.pastGrace')}
                dotColor={colors.statusLate}
                onPress={() => navigation.navigate('Roster')}
              />
              <StatCard
                label={t('owner.dashboard.onLeave')}
                value={attendance.onLeave}
                caption={t('owner.dashboard.approved')}
                dotColor={colors.statusOnLeave}
                onPress={() => navigation.navigate('Approvals')}
              />
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroHeaderRow}>
              <Text style={styles.heroLabel}>{t('owner.dashboard.laborCostToday')}</Text>
              {budgetPercent !== null ? (
                <View style={styles.budgetPill}>
                  <Text style={styles.budgetPillText}>{t('owner.dashboard.percentOfBudget', { percent: budgetPercent })}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.heroValue}>{formatCurrency(laborCostToday)}</Text>
            {dailyBudget ? (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, budgetPercent ?? 0)}%` }]} />
              </View>
            ) : null}
            <View style={styles.heroFooterRow}>
              <Text style={styles.heroFooterText}>{t('owner.dashboard.shiftsLogged', { count: shiftsLoggedToday })}</Text>
              {dailyBudget ? <Text style={styles.heroFooterText}>{t('owner.dashboard.budgetAmount', { amount: formatCurrency(dailyBudget) })}</Text> : null}
            </View>
          </View>

          <View style={styles.monthlyCard}>
            <View style={styles.monthlyHeaderRow}>
              <Text style={styles.monthlyTitle}>{t('owner.dashboard.payrollBudgetAccrued')}</Text>
              <Text style={styles.monthlySubtitle}>{t('owner.dashboard.monthToDate')}</Text>
            </View>
            <Text style={styles.monthlyValue}>{formatCurrency(monthToDateCost)}</Text>
            {monthlyBudget !== null ? (
              <>
                <Text style={styles.monthlyCaption}>
                  {t('owner.dashboard.ofBudget', { amount: formatCurrency(monthlyBudget), percent: monthlyBudgetPercent ?? 0 })}
                </Text>
                <View style={styles.progressTrackLight}>
                  <View style={[styles.progressFillLight, { width: `${Math.min(100, monthlyBudgetPercent ?? 0)}%` }]} />
                </View>
              </>
            ) : null}
            <MonthlyBarChart values={monthlyCosts} todayIndex={monthlyCosts.length - 1} />
          </View>

          <LateArrivalsCard arrivals={lateArrivals} />

          {pendingCount > 0 ? (
            <View style={styles.approvalsBanner}>
              <View style={styles.approvalsBadge}>
                <Text style={styles.approvalsBadgeText}>{pendingCount}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.approvalsTitle}>{t('owner.dashboard.pendingApprovals')}</Text>
                <Text style={styles.approvalsSubtitle}>{t('owner.dashboard.pendingApprovalsSubtitle')}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          ) : null}

          <SectionLabel>{t('owner.dashboard.onShift', { count: activeStaff.length })}</SectionLabel>
        </>
      }
      ListEmptyComponent={<Text style={styles.empty}>{t('owner.dashboard.noOneClockedIn')}</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Avatar id={item.staffId} name={item.staffName} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {item.staffName} {item.mockedLocation ? '⚠️' : ''}
            </Text>
            <Text style={styles.meta}>
              {item.jobTitle ?? ''}
              {item.jobTitle ? ' · ' : ''}
              <Text style={item.status === 'late' ? styles.lateTag : styles.onTimeTag}>
                {item.status === 'late' ? t('owner.dashboard.lateTag') : t('owner.dashboard.onTimeTag')}
              </Text>
            </Text>
          </View>
          <Text style={styles.since}>{t('owner.dashboard.since', { time: new Date(item.clockInAt).toLocaleTimeString() })}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greeting: { fontSize: 13, color: colors.textSecondary },
  shopName: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 10, ...shadow },
  openDot: { width: 7, height: 7, borderRadius: 4 },
  openPillText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  dateText: { fontSize: 12, color: colors.textMuted, flex: 1, marginRight: spacing.sm },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.statusPresentBg, borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.statusPresent },
  livePillText: { fontSize: 11, fontWeight: '700', color: colors.statusPresent, fontFamily: 'monospace' },
  statGrid: { gap: spacing.md, marginBottom: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md },
  heroCard: { backgroundColor: colors.brandDark, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#BFE0CE', fontSize: 14, fontWeight: '600' },
  budgetPill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 10 },
  budgetPillText: { color: '#BFE0CE', fontSize: 12, fontWeight: '700' },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '800', fontFamily: 'monospace' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#9AD8B6', borderRadius: 3 },
  heroFooterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroFooterText: { color: '#9FB8AA', fontSize: 12, fontFamily: 'monospace' },
  monthlyCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.md, ...shadow },
  monthlyHeaderRow: { gap: 2 },
  monthlyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  monthlySubtitle: { fontSize: 12, color: colors.textMuted },
  monthlyValue: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, fontFamily: 'monospace' },
  monthlyCaption: { fontSize: 12, color: colors.textMuted },
  progressTrackLight: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  progressFillLight: { height: '100%', backgroundColor: colors.brand, borderRadius: 3 },
  approvalsBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.approvalsBannerBg, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md },
  approvalsBadge: { backgroundColor: colors.approvalsBannerAccent, borderRadius: radii.pill, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  approvalsBadgeText: { color: '#fff', fontWeight: '800' },
  approvalsTitle: { fontWeight: '700', color: colors.textPrimary },
  approvalsSubtitle: { color: colors.textSecondary, fontSize: 13 },
  chevron: { fontSize: 22, color: colors.approvalsBannerAccent },
  empty: { color: colors.textMuted, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textMuted, fontSize: 12 },
  onTimeTag: { color: colors.statusPresent, fontWeight: '700' },
  lateTag: { color: colors.statusLate, fontWeight: '700' },
  since: { color: colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
});
