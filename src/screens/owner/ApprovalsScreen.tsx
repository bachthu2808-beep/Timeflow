import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ApprovalRequest, SwapRequest } from '../../types';

export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);

  async function load() {
    if (!profile) return;

    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('owner_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setRequests(
        data.map((row: any) => ({
          id: row.id,
          staffId: row.staff_id,
          ownerId: row.owner_id,
          kind: row.kind,
          status: row.status,
          requestedStart: row.requested_start,
          requestedEnd: row.requested_end,
          note: row.note,
          createdAt: row.created_at,
        }))
      );
    }

    const { data: swapData } = await supabase
      .from('swap_requests')
      .select('*')
      .eq('owner_id', profile.id)
      .eq('status', 'accepted');

    if (swapData) {
      setSwaps(
        swapData.map((row: any) => ({
          id: row.id,
          scheduleId: row.schedule_id,
          ownerId: row.owner_id,
          requestingStaffId: row.requesting_staff_id,
          targetStaffId: row.target_staff_id,
          acceptedByStaffId: row.accepted_by_staff_id,
          status: row.status,
          createdAt: row.created_at,
        }))
      );
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel('owner-approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function respond(id: string, status: 'approved' | 'denied') {
    const { error } = await supabase.from('approval_requests').update({ status }).eq('id', id);
    if (error) Alert.alert(t('common.failedTitle'), error.message);
  }

  async function respondToSwap(swap: SwapRequest, approve: boolean) {
    if (approve && swap.acceptedByStaffId) {
      const { error: scheduleError } = await supabase
        .from('shift_schedule')
        .update({ staff_id: swap.acceptedByStaffId })
        .eq('id', swap.scheduleId);
      if (scheduleError) {
        Alert.alert(t('common.failedTitle'), scheduleError.message);
        return;
      }
    }

    const { error } = await supabase
      .from('swap_requests')
      .update({ status: approve ? 'owner_approved' : 'denied' })
      .eq('id', swap.id);
    if (error) Alert.alert(t('common.failedTitle'), error.message);
    else load();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('owner.approvals.pendingRequests')}</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>{t('owner.approvals.nothingPending')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kind}>{item.kind === 'time_off' ? t('owner.approvals.timeOff') : t('owner.approvals.scheduleChange')}</Text>
              <Text style={styles.note}>{item.note ?? ''}</Text>
            </View>
            <Pressable style={styles.approve} onPress={() => respond(item.id, 'approved')}>
              <Text style={styles.actionText}>{t('common.approve')}</Text>
            </Pressable>
            <Pressable style={styles.deny} onPress={() => respond(item.id, 'denied')}>
              <Text style={styles.actionText}>{t('common.deny')}</Text>
            </Pressable>
          </View>
        )}
      />

      <Text style={styles.title}>{t('owner.approvals.swapsAwaitingOk')}</Text>
      <FlatList
        data={swaps}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>{t('owner.approvals.nonePending')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={{ flex: 1 }}>{t('owner.approvals.coworkerAccepted')}</Text>
            <Pressable style={styles.approve} onPress={() => respondToSwap(item, true)}>
              <Text style={styles.actionText}>{t('common.approve')}</Text>
            </Pressable>
            <Pressable style={styles.deny} onPress={() => respondToSwap(item, false)}>
              <Text style={styles.actionText}>{t('common.deny')}</Text>
            </Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  kind: { fontWeight: '600' },
  note: { color: '#888' },
  approve: { backgroundColor: '#111', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  deny: { backgroundColor: '#c00', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  actionText: { color: '#fff', fontWeight: '600' },
});
