import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { AuditLogEntry } from '../../types';

const KNOWN_ACTIONS = ['shift_clock_in', 'shift_updated', 'approval_requested', 'approval_approved', 'approval_denied'];

export default function AuditLogScreen() {
  const { t } = useTranslation();
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
      <Text style={styles.title}>{t('owner.auditLog.title')}</Text>
      <Text style={styles.subtitle}>{t('owner.auditLog.subtitle')}</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>{t('owner.auditLog.noActivity')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.action}>
              {KNOWN_ACTIONS.includes(item.action) ? t(`owner.auditLog.actions.${item.action}`) : item.action.replace(/_/g, ' ')}
            </Text>
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
