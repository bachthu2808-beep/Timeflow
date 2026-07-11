import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, radii, spacing } from '../../theme';
import type { ChatMessage } from '../../types';

interface Props {
  ownerId: string;
  staffId: string;
}

export default function ChatThreadScreen({ ownerId, staffId }: Props) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  async function load() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('staff_id', staffId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(
        data.map((row: any) => ({
          id: row.id,
          ownerId: row.owner_id,
          staffId: row.staff_id,
          senderId: row.sender_id,
          body: row.body,
          createdAt: row.created_at,
        }))
      );
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`chat-${ownerId}-${staffId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `staff_id=eq.${staffId}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, staffId]);

  async function send() {
    if (!draft.trim() || !profile) return;
    const body = draft.trim();
    setDraft('');
    await supabase.from('messages').insert({ owner_id: ownerId, staff_id: staffId, sender_id: profile.id, body });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.senderId === profile?.id ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={item.senderId === profile?.id ? styles.bubbleTextMine : styles.bubbleText}>{item.body}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('chat.messagePlaceholder')}
          onSubmitEditing={send}
        />
        <Pressable style={styles.sendButton} onPress={send}>
          <Text style={styles.sendButtonText}>{t('chat.send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm },
  bubble: { maxWidth: '80%', borderRadius: radii.md, padding: spacing.md, marginBottom: 4 },
  bubbleMine: { backgroundColor: colors.brand, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: colors.surface, alignSelf: 'flex-start' },
  bubbleText: { color: colors.textPrimary },
  bubbleTextMine: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: colors.textPrimary },
  sendButton: { backgroundColor: colors.brand, borderRadius: radii.pill, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontWeight: '700' },
});
