import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, radii, shadow, spacing } from '../../theme';
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
    <FlatList
      style={styles.screen}
      data={entries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <Text style={styles.title}>{t('owner.auditLog.title')}</Text>
          <Text style={styles.subtitle}>{t('owner.auditLog.subtitle')}</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>{t('owner.auditLog.noActivity')}</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.action}>
            {KNOWN_ACTIONS.includes(item.action) ? t(`owner.auditLog.actions.${item.action}`) : item.action.replace(/_/g, ' ')}
          </Text>
          <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  headerBlock: { marginBottom: spacing.sm },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  empty: { color: colors.textMuted, marginTop: spacing.sm },
  card: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.xs, ...shadow },
  action: { fontWeight: '700', textTransform: 'capitalize', color: colors.textPrimary },
  time: { color: colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
});
