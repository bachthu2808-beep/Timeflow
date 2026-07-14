import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Avatar from '../../components/Avatar';
import { colors, radii, shadow, spacing } from '../../theme';

export type ChatStackParamList = {
  ChatList: undefined;
  ChatThread: { staffId: string; staffName: string };
};

interface StaffRow {
  id: string;
  fullName: string;
}

export default function ChatListScreen({ navigation }: NativeStackScreenProps<ChatStackParamList, 'ChatList'>) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('owner_id', profile.id)
      .eq('role', 'employee')
      .is('deactivated_at', null)
      .then(({ data }) => {
        if (data) setStaff(data.map((row: any) => ({ id: row.id, fullName: row.full_name })));
      });
  }, [profile]);

  return (
    <FlatList
      style={styles.screen}
      data={staff}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={<Text style={styles.empty}>{t('owner.chatList.noStaffToMessage')}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('ChatThread', { staffId: item.id, staffName: item.fullName })}
        >
          <Avatar id={item.id} name={item.fullName} size={40} />
          <Text style={styles.name}>{item.fullName}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.xs },
  empty: { color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.xs, ...shadow },
  name: { fontWeight: '700', fontSize: 15, color: colors.textPrimary },
});
