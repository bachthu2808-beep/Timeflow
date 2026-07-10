import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ApprovalRequest } from '../../types';

export default function ApprovalsScreen() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);

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
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel('owner-approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function respond(id: string, status: 'approved' | 'denied') {
    const { error } = await supabase.from('approval_requests').update({ status }).eq('id', id);
    if (error) Alert.alert('Failed', error.message);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending requests</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nothing pending.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kind}>{item.kind === 'time_off' ? 'Time off' : 'Schedule change'}</Text>
              <Text style={styles.note}>{item.note ?? ''}</Text>
            </View>
            <Pressable style={styles.approve} onPress={() => respond(item.id, 'approved')}>
              <Text style={styles.actionText}>Approve</Text>
            </Pressable>
            <Pressable style={styles.deny} onPress={() => respond(item.id, 'denied')}>
              <Text style={styles.actionText}>Deny</Text>
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
