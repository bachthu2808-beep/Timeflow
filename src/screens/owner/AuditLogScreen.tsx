import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { AuditLogEntry } from '../../types';

export default function AuditLogScreen() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from('audit_log')
      .select('*')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error || !data) return;
        setEntries(
          data.map((row: any) => ({
            id: row.id,
            ownerId: row.owner_id,
            actorId: row.actor_id,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id,
            detail: row.detail,
            createdAt: row.created_at,
          }))
        );
      });
  }, [profile]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audit log</Text>
      <Text style={styles.subtitle}>
        Every clock-in/out and approval decision, recorded automatically for dispute resolution.
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No activity yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.action}>{item.action.replace(/_/g, ' ')}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#888', marginBottom: 8 },
  empty: { color: '#888', marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  action: { fontWeight: '600', textTransform: 'capitalize' },
  time: { color: '#888' },
});
