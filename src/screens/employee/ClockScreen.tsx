import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { isWithinGeofence } from '../../lib/geofence';
import { calculatePay } from '../../payroll/calculatePay';
import { GENERIC_PAY_RULES } from '../../payroll/payRules';
import type { ShiftRecord, Shop } from '../../types';

// TODO: replace with the employee's assigned shop, loaded from Supabase.
const PLACEHOLDER_SHOP: Shop = {
  id: 'placeholder',
  ownerId: 'placeholder',
  name: 'Shop',
  latitude: 0,
  longitude: 0,
  geofenceRadiusMeters: 100,
};

export default function ClockScreen() {
  const { profile } = useAuth();
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => Math.floor(Date.now() / 60000));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNowMinutes(Math.floor(Date.now() / 60000)), 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleClockIn() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location required', 'TimeFlow needs location access to verify you are at the shop.');
      return;
    }

    setBusy(true);
    try {
      const position = await Location.getCurrentPositionAsync({});
      const withinRange = isWithinGeofence(
        { latitude: position.coords.latitude, longitude: position.coords.longitude },
        { latitude: PLACEHOLDER_SHOP.latitude, longitude: PLACEHOLDER_SHOP.longitude },
        PLACEHOLDER_SHOP.geofenceRadiusMeters
      );

      if (!withinRange) {
        Alert.alert('Out of range', "You're not close enough to the shop to clock in.");
        return;
      }

      if (!profile) {
        return;
      }

      const { data, error } = await supabase
        .from('shifts')
        .insert({ staff_id: profile.id, shop_id: PLACEHOLDER_SHOP.id, paid_lunch: false, status: 'active' })
        .select()
        .single();

      if (error) {
        Alert.alert('Clock-in failed', error.message);
        return;
      }

      setActiveShift({
        id: data.id,
        staffId: data.staff_id,
        shopId: data.shop_id,
        clockInAt: data.clock_in_at,
        clockOutAt: null,
        paidLunch: data.paid_lunch,
        status: 'active',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    if (!activeShift) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('shifts')
        .update({ clock_out_at: new Date().toISOString(), status: 'completed' })
        .eq('id', activeShift.id);

      if (error) {
        Alert.alert('Clock-out failed', error.message);
        return;
      }

      setActiveShift(null);
    } finally {
      setBusy(false);
    }
  }

  const livePay =
    activeShift && profile
      ? calculatePay({
          basis: profile.payBasis,
          hourlyRate: profile.hourlyRate ?? undefined,
          monthlyRate: profile.monthlyRate ?? undefined,
          lunchAllowancePerShift: profile.lunchAllowancePerShift,
          rules: GENERIC_PAY_RULES, // TODO: load the owner's configured PayRuleSet
          nowMinutes,
          shifts: [
            {
              clockInMinutes: Math.floor(new Date(activeShift.clockInAt).getTime() / 60000),
              clockOutMinutes: null,
              paidLunch: activeShift.paidLunch,
            },
          ],
        })
      : null;

  return (
    <View style={styles.container}>
      {activeShift ? (
        <>
          <Text style={styles.label}>Currently clocked in</Text>
          <Text style={styles.earnings}>${livePay?.totalPay.toFixed(2) ?? '0.00'}</Text>
          <Pressable style={[styles.button, styles.buttonDanger]} onPress={handleClockOut} disabled={busy}>
            <Text style={styles.buttonText}>Clock out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>You are not clocked in</Text>
          <Pressable style={styles.button} onPress={handleClockIn} disabled={busy}>
            <Text style={styles.buttonText}>Clock in</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  label: { fontSize: 16, color: '#555' },
  earnings: { fontSize: 48, fontWeight: '700' },
  button: { backgroundColor: '#111', borderRadius: 999, paddingVertical: 16, paddingHorizontal: 40 },
  buttonDanger: { backgroundColor: '#c00' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 18 },
});
