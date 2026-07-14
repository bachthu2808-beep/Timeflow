import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { notify } from '../../lib/notify';
import { confirm } from '../../lib/confirm';
import { formatCurrency, parseCurrencyInput } from '../../lib/currency';
import Avatar from '../../components/Avatar';
import SectionLabel from '../../components/SectionLabel';
import { colors, radii, shadow, spacing } from '../../theme';
import type { PayBasis, Profile, Shop, StaffInvitation } from '../../types';

export default function RosterScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [query, setQuery] = useState('');
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [payBasis, setPayBasis] = useState<PayBasis>('hourly');
  const [rate, setRate] = useState('');
  const [lunchAllowance, setLunchAllowance] = useState('0');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!profile) return;

    const { data: shopData } = await supabase.from('shops').select('*').eq('owner_id', profile.id);
    if (shopData) {
      setShops(
        shopData.map((row: any) => ({
          id: row.id,
          ownerId: row.owner_id,
          name: row.name,
          latitude: row.latitude,
          longitude: row.longitude,
          geofenceRadiusMeters: row.geofence_radius_meters,
          dailyLaborBudget: row.daily_labor_budget,
          isOpen: row.is_open,
        }))
      );
    }

    const { data: staffData } = await supabase
      .from('profiles')
      .select('*')
      .eq('owner_id', profile.id)
      .eq('role', 'employee');

    if (staffData) {
      setStaff(
        staffData.map((row: any) => ({
          id: row.id,
          ownerId: row.owner_id,
          role: row.role,
          fullName: row.full_name,
          jobTitle: row.job_title,
          payBasis: row.pay_basis,
          hourlyRate: row.hourly_rate,
          monthlyRate: row.monthly_rate,
          lunchAllowancePerShift: row.lunch_allowance_per_shift,
          payRuleSetId: row.pay_rule_set_id,
          defaultShopId: row.default_shop_id,
          expoPushToken: row.expo_push_token,
          deactivatedAt: row.deactivated_at,
        }))
      );
    }

    const { data: inviteData } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('owner_id', profile.id)
      .is('consumed_at', null);

    if (inviteData) {
      setInvitations(
        inviteData.map((row: any) => ({
          id: row.id,
          ownerId: row.owner_id,
          email: row.email,
          fullName: row.full_name,
          jobTitle: row.job_title,
          payBasis: row.pay_basis,
          hourlyRate: row.hourly_rate,
          monthlyRate: row.monthly_rate,
          lunchAllowancePerShift: row.lunch_allowance_per_shift,
          defaultShopId: row.default_shop_id,
          consumedAt: row.consumed_at,
          createdAt: row.created_at,
        }))
      );
    }
  }

  useEffect(() => {
    load();
  }, [profile]);

  const activeStaff = useMemo(() => staff.filter((s) => !s.deactivatedAt), [staff]);
  const removedStaff = useMemo(() => staff.filter((s) => s.deactivatedAt), [staff]);

  const filteredStaff = useMemo(() => {
    if (!query.trim()) return activeStaff;
    const q = query.trim().toLowerCase();
    return activeStaff.filter((s) => s.fullName.toLowerCase().includes(q));
  }, [activeStaff, query]);

  function resetInviteForm() {
    setFullName('');
    setEmail('');
    setJobTitle('');
    setPayBasis('hourly');
    setRate('');
    setLunchAllowance('0');
    setSelectedShopId(shops[0]?.id ?? null);
  }

  function openInviteForm() {
    resetInviteForm();
    setInviteFormOpen(true);
  }

  function openEditForm(person: Profile) {
    setEditing(person);
    setJobTitle(person.jobTitle ?? '');
    setPayBasis(person.payBasis);
    setRate(String(person.payBasis === 'hourly' ? person.hourlyRate ?? '' : person.monthlyRate ?? ''));
    setSelectedShopId(person.defaultShopId ?? null);
  }

  async function sendInvite() {
    if (!profile) return;
    if (!fullName.trim() || !email.trim() || !rate.trim()) {
      notify(t('common.missingInfoTitle'), t('owner.roster.missingInfoMessage'));
      return;
    }

    const parsedRate = parseCurrencyInput(rate);
    if (parsedRate === null || parsedRate <= 0) {
      notify(t('common.missingInfoTitle'), t('owner.roster.invalidRateMessage'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('staff_invitations').insert({
        owner_id: profile.id,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        job_title: jobTitle.trim() || null,
        pay_basis: payBasis,
        hourly_rate: payBasis === 'hourly' ? parsedRate : null,
        monthly_rate: payBasis === 'monthly' ? parsedRate : null,
        lunch_allowance_per_shift: parseCurrencyInput(lunchAllowance) ?? 0,
        default_shop_id: selectedShopId,
      });

      if (error) {
        notify(t('owner.roster.failedToInviteTitle'), error.message);
        return;
      }

      setInviteFormOpen(false);
      load();
      notify(t('owner.roster.invitedTitle'), t('owner.roster.invitedMessage', { fullName, email }));
    } finally {
      setSubmitting(false);
    }
  }

  async function savePayEdit() {
    if (!editing) return;

    const parsedRate = parseCurrencyInput(rate);
    if (parsedRate === null || parsedRate <= 0) {
      notify(t('common.missingInfoTitle'), t('owner.roster.invalidRateMessage'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          job_title: jobTitle.trim() || null,
          pay_basis: payBasis,
          hourly_rate: payBasis === 'hourly' ? parsedRate : null,
          monthly_rate: payBasis === 'monthly' ? parsedRate : null,
          default_shop_id: selectedShopId,
        })
        .eq('id', editing.id);

      if (error) {
        notify(t('common.failedToSaveTitle'), error.message);
        return;
      }

      setEditing(null);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function removeStaff(person: Profile) {
    const ok = await confirm(
      t('owner.roster.removeConfirmTitle', { fullName: person.fullName }),
      t('owner.roster.removeConfirmMessage'),
      t('common.cancel'),
      t('owner.roster.removeStaff')
    );
    if (!ok) return;

    const { error } = await supabase
      .from('profiles')
      .update({ deactivated_at: new Date().toISOString() })
      .eq('id', person.id);

    if (error) {
      notify(t('owner.roster.removeFailedTitle'), error.message);
      return;
    }

    setEditing(null);
    load();
  }

  async function restoreStaff(person: Profile) {
    const { error } = await supabase.from('profiles').update({ deactivated_at: null }).eq('id', person.id);
    if (error) {
      notify(t('owner.roster.restoreFailedTitle'), error.message);
      return;
    }
    load();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('owner.roster.searchPlaceholder', { count: activeStaff.length })}
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <Pressable style={styles.addButton} onPress={openInviteForm}>
          <Text style={styles.addButtonText}>{t('owner.roster.add')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredStaff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<SectionLabel>{t('owner.roster.staffCount', { count: filteredStaff.length })}</SectionLabel>}
        ListEmptyComponent={<Text style={styles.empty}>{t('owner.roster.noStaffYet')}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openEditForm(item)}>
            <Avatar id={item.id} name={item.fullName} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.meta}>{item.jobTitle ?? t('owner.roster.noJobTitle')}</Text>
            </View>
            <View style={styles.rateBlock}>
              <Text style={styles.rate}>
                {formatCurrency(item.payBasis === 'hourly' ? item.hourlyRate ?? 0 : item.monthlyRate ?? 0)}
                {item.payBasis === 'hourly' ? t('owner.roster.perHour') : t('owner.roster.perMonth')}
              </Text>
              <Text style={styles.tapToEdit}>{t('owner.roster.tapToEditPay')}</Text>
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          <>
            {invitations.length > 0 ? (
              <>
                <SectionLabel>{t('owner.roster.pendingInvitations')}</SectionLabel>
                {invitations.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <Avatar id={item.id} name={item.fullName} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.fullName}</Text>
                      <Text style={styles.meta}>{item.email}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
            {removedStaff.length > 0 ? (
              <>
                <SectionLabel>{t('owner.roster.removedStaff')}</SectionLabel>
                {removedStaff.map((item) => (
                  <View key={item.id} style={[styles.card, styles.cardRemoved]}>
                    <Avatar id={item.id} name={item.fullName} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.fullName}</Text>
                      <Text style={styles.meta}>{item.jobTitle ?? t('owner.roster.noJobTitle')}</Text>
                    </View>
                    <Pressable style={styles.restoreButton} onPress={() => restoreStaff(item)}>
                      <Text style={styles.restoreButtonText}>{t('owner.roster.restore')}</Text>
                    </Pressable>
                  </View>
                ))}
              </>
            ) : null}
          </>
        }
      />

      <Modal visible={inviteFormOpen} animationType="slide" onRequestClose={() => setInviteFormOpen(false)}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={styles.formTitle}>{t('owner.roster.inviteStaff')}</Text>
          <TextInput style={styles.input} placeholder={t('owner.roster.fullNamePlaceholder')} value={fullName} onChangeText={setFullName} />
          <TextInput
            style={styles.input}
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput style={styles.input} placeholder={t('owner.roster.jobTitlePlaceholder')} value={jobTitle} onChangeText={setJobTitle} />
          <PayBasisChips payBasis={payBasis} setPayBasis={setPayBasis} t={t} />
          <TextInput
            style={styles.input}
            placeholder={payBasis === 'hourly' ? t('owner.roster.hourlyRatePlaceholder') : t('owner.roster.monthlyRatePlaceholder')}
            keyboardType="decimal-pad"
            value={rate}
            onChangeText={setRate}
          />
          <TextInput
            style={styles.input}
            placeholder={t('owner.roster.lunchAllowancePlaceholder')}
            keyboardType="decimal-pad"
            value={lunchAllowance}
            onChangeText={setLunchAllowance}
          />
          <ShopPicker shops={shops} selectedShopId={selectedShopId} onSelect={setSelectedShopId} t={t} />
          <Pressable style={styles.saveButton} onPress={sendInvite} disabled={submitting}>
            <Text style={styles.saveButtonText}>{submitting ? t('owner.roster.sending') : t('owner.roster.sendInvitation')}</Text>
          </Pressable>
          <Pressable onPress={() => setInviteFormOpen(false)}>
            <Text style={styles.cancel}>{t('common.cancel')}</Text>
          </Pressable>
        </ScrollView>
      </Modal>

      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={styles.formTitle}>{editing?.fullName}</Text>
          <TextInput style={styles.input} placeholder={t('owner.roster.jobTitlePlaceholder')} value={jobTitle} onChangeText={setJobTitle} />
          <PayBasisChips payBasis={payBasis} setPayBasis={setPayBasis} t={t} />
          <TextInput
            style={styles.input}
            placeholder={payBasis === 'hourly' ? t('owner.roster.hourlyRatePlaceholder') : t('owner.roster.monthlyRatePlaceholder')}
            keyboardType="decimal-pad"
            value={rate}
            onChangeText={setRate}
          />
          <ShopPicker shops={shops} selectedShopId={selectedShopId} onSelect={setSelectedShopId} t={t} />
          <Pressable style={styles.saveButton} onPress={savePayEdit} disabled={submitting}>
            <Text style={styles.saveButtonText}>{submitting ? t('common.saving') : t('common.save')}</Text>
          </Pressable>
          <Pressable style={styles.removeButton} onPress={() => editing && removeStaff(editing)}>
            <Text style={styles.removeButtonText}>{t('owner.roster.removeStaff')}</Text>
          </Pressable>
          <Pressable onPress={() => setEditing(null)}>
            <Text style={styles.cancel}>{t('common.cancel')}</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  );
}

function PayBasisChips({
  payBasis,
  setPayBasis,
  t,
}: {
  payBasis: PayBasis;
  setPayBasis: (b: PayBasis) => void;
  t: (key: string) => string;
}) {
  return (
    <View style={styles.chipRow}>
      <Pressable style={[styles.chip, payBasis === 'hourly' && styles.chipSelected]} onPress={() => setPayBasis('hourly')}>
        <Text style={payBasis === 'hourly' ? styles.chipTextSelected : styles.chipText}>{t('common.hourly')}</Text>
      </Pressable>
      <Pressable style={[styles.chip, payBasis === 'monthly' && styles.chipSelected]} onPress={() => setPayBasis('monthly')}>
        <Text style={payBasis === 'monthly' ? styles.chipTextSelected : styles.chipText}>{t('common.monthly')}</Text>
      </Pressable>
    </View>
  );
}

function ShopPicker({
  shops,
  selectedShopId,
  onSelect,
  t,
}: {
  shops: Shop[];
  selectedShopId: string | null;
  onSelect: (id: string) => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <Text style={styles.label}>{t('owner.roster.assignedShop')}</Text>
      {shops.length === 0 ? (
        <Text style={styles.meta}>{t('owner.roster.noShopsYet')}</Text>
      ) : (
        <View style={styles.chipRow}>
          {shops.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onSelect(s.id)}
              style={[styles.chip, selectedShopId === s.id && styles.chipSelected]}
            >
              <Text style={selectedShopId === s.id ? styles.chipTextSelected : styles.chipText}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!selectedShopId ? <Text style={styles.warning}>{t('owner.roster.noShopAssignedWarning')}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md, ...shadow },
  searchIcon: { color: colors.textMuted, marginRight: spacing.xs },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.textPrimary },
  addButton: { backgroundColor: colors.brand, borderRadius: radii.pill, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: '700' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  empty: { color: colors.textMuted, marginTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginVertical: 4, ...shadow },
  cardRemoved: { opacity: 0.6 },
  restoreButton: { borderWidth: 1, borderColor: colors.brand, borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 14 },
  restoreButtonText: { color: colors.brand, fontWeight: '700', fontSize: 13 },
  name: { fontWeight: '700', fontSize: 15, color: colors.textPrimary },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  rateBlock: { alignItems: 'flex-end' },
  rate: { fontWeight: '700', color: colors.brand, fontFamily: 'monospace' },
  tapToEdit: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  formContainer: { padding: spacing.xl, gap: spacing.md },
  formTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  label: { color: colors.textMuted, fontSize: 12 },
  warning: { color: colors.danger, fontSize: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md, fontSize: 16, color: colors.textPrimary },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 14 },
  chipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textPrimary },
  chipTextSelected: { color: '#fff' },
  saveButton: { backgroundColor: colors.brand, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveButtonText: { color: '#fff', fontWeight: '700' },
  removeButton: { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  removeButtonText: { color: colors.danger, fontWeight: '700' },
  cancel: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
