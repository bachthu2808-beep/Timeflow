import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export type ChatStackParamList = {
  ChatList: undefined;
  ChatThread: { staffId: string; staffName: string };
};

interface StaffRow {
  id: string;
  fullName: string;
}

export default function ChatListScreen({ navigation }: NativeStackScreenProps<ChatStackParamList, 'ChatList'>) {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('owner_id', profile.id)
      .eq('role', 'employee')
      .then(({ data }) => {
        if (data) setStaff(data.map((row: any) => ({ id: row.id, fullName: row.full_name })));
      });
  }, [profile]);

  return (
    <View style={styles.container}>
      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No staff to message yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ChatThread', { staffId: item.id, staffName: item.fullName })}
          >
            <Text style={styles.name}>{item.fullName}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  empty: { color: '#888' },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontWeight: '600', fontSize: 16 },
});
