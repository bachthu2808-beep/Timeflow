import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../types';

interface Props {
  ownerId: string;
  staffId: string;
}

export default function ChatThreadScreen({ ownerId, staffId }: Props) {
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
          placeholder="Message…"
          onSubmitEditing={send}
        />
        <Pressable style={styles.sendButton} onPress={send}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 10, marginBottom: 4 },
  bubbleMine: { backgroundColor: '#111', alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: '#eee', alignSelf: 'flex-start' },
  bubbleText: { color: '#111' },
  bubbleTextMine: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  sendButton: { backgroundColor: '#111', borderRadius: 999, paddingHorizontal: 16, justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});
