import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { PayBasis, Profile, StaffInvitation } from '../../types';

export default function RosterScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [payBasis, setPayBasis] = useState<PayBasis>('hourly');
  const [rate, setRate] = useState('');
  const [lunchAllowance, setLunchAllowance] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!profile) return;

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

  function resetForm() {
    setFullName('');
    setEmail('');
    setPayBasis('hourly');
    setRate('');
    setLunchAllowance('0');
  }

  async function sendInvite() {
    if (!profile) return;
    if (!fullName.trim() || !email.trim() || !rate.trim()) {
      Alert.alert(t('common.missingInfoTitle'), t('owner.roster.missingInfoMessage'));
      return;
    }

    setSubmitting(true);
    try {
      const { data: defaultShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', profile.id)
        .limit(1)
        .maybeSingle();

      const { error } = await supabase.from('staff_invitations').insert({
        owner_id: profile.id,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        pay_basis: payBasis,
        hourly_rate: payBasis === 'hourly' ? parseFloat(rate) : null,
        monthly_rate: payBasis === 'monthly' ? parseFloat(rate) : null,
        lunch_allowance_per_shift: parseFloat(lunchAllowance) || 0,
        default_shop_id: defaultShop?.id ?? null,
      });

      if (error) {
        Alert.alert(t('owner.roster.failedToInviteTitle'), error.message);
        return;
      }

      resetForm();
      setFormOpen(false);
      load();
      Alert.alert(t('owner.roster.invitedTitle'), t('owner.roster.invitedMessage', { fullName, email }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('owner.roster.title')}</Text>
        <Pressable style={styles.inviteButton} onPress={() => setFormOpen(true)}>
          <Text style={styles.inviteButtonText}>{t('owner.roster.inviteStaff')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>{t('owner.roster.noStaffYet')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.fullName}</Text>
            <Text style={styles.rate}>
              {item.payBasis === 'hourly'
                ? t('owner.roster.hourlyRate', { rate: item.hourlyRate ?? 0 })
                : t('owner.roster.monthlyRate', { rate: item.monthlyRate ?? 0 })}
            </Text>
          </View>
        )}
      />

      {invitations.length > 0 ? (
        <>
          <Text style={styles.subtitle}>{t('owner.roster.pendingInvitations')}</Text>
          <FlatList
            data={invitations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.rate}>{item.email}</Text>
              </View>
            )}
          />
        </>
      ) : null}

      <Modal visible={formOpen} animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={styles.title}>{t('owner.roster.inviteStaff')}</Text>
          <TextInput style={styles.input} placeholder={t('owner.roster.fullNamePlaceholder')} value={fullName} onChangeText={setFullName} />
          <TextInput
            style={styles.input}
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, payBasis === 'hourly' && styles.chipSelected]}
              onPress={() => setPayBasis('hourly')}
            >
              <Text style={payBasis === 'hourly' ? styles.chipTextSelected : styles.chipText}>{t('common.hourly')}</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, payBasis === 'monthly' && styles.chipSelected]}
              onPress={() => setPayBasis('monthly')}
            >
              <Text style={payBasis === 'monthly' ? styles.chipTextSelected : styles.chipText}>{t('common.monthly')}</Text>
            </Pressable>
          </View>
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
          <Pressable style={styles.saveButton} onPress={sendInvite} disabled={submitting}>
            <Text style={styles.saveButtonText}>{submitting ? t('owner.roster.sending') : t('owner.roster.sendInvitation')}</Text>
          </Pressable>
          <Pressable onPress={() => setFormOpen(false)}>
            <Text style={styles.cancel}>{t('common.cancel')}</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 16, fontWeight: '600', marginTop: 16, color: '#888' },
  empty: { color: '#888', marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontWeight: '600' },
  rate: { color: '#888' },
  inviteButton: { backgroundColor: '#111', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  inviteButtonText: { color: '#fff', fontWeight: '600' },
  formContainer: { padding: 24, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipSelected: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#111' },
  chipTextSelected: { color: '#fff' },
  saveButton: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  cancel: { color: '#888', textAlign: 'center', marginTop: 8 },
});
