import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

export default function RosterScreen() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from('profiles')
      .select('*')
      .eq('owner_id', profile.id)
      .eq('role', 'employee')
      .then(({ data, error }) => {
        if (error || !data) return;
        setStaff(
          data.map((row: any) => ({
            id: row.id,
            ownerId: row.owner_id,
            role: row.role,
            fullName: row.full_name,
            payBasis: row.pay_basis,
            hourlyRate: row.hourly_rate,
            monthlyRate: row.monthly_rate,
            lunchAllowancePerShift: row.lunch_allowance_per_shift,
            payRuleSetId: row.pay_rule_set_id,
            defaultShopId: row.default_shop_id,
            expoPushToken: row.expo_push_token,
          }))
        );
      });
  }, [profile]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff roster</Text>
      {/* TODO: add-staff form (invite by email, set pay basis/rate/lunch allowance). */}
      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No staff added yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.fullName}</Text>
            <Text style={styles.rate}>
              {item.payBasis === 'hourly' ? `$${item.hourlyRate ?? 0}/hr` : `$${item.monthlyRate ?? 0}/mo`}
            </Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontWeight: '600' },
  rate: { color: '#888' },
});
