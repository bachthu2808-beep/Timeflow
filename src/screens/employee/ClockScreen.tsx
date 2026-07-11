import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { isWithinGeofence } from '../../lib/geofence';
import { enqueue, flushQueue, getQueueLength } from '../../lib/offlineQueue';
import { calculatePay } from '../../payroll/calculatePay';
import { calculateOnTimeStreak } from '../../payroll/streaks';
import { GENERIC_PAY_RULES } from '../../payroll/payRules';
import type { ShiftRecord, Shop } from '../../types';

async function uploadClockInPhoto(staffId: string, uri: string): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const path = `${staffId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('clock-in-photos').upload(path, blob, {
      contentType: 'image/jpeg',
    });
    if (error) return null;
    return path;
  } catch {
    return null; // photo capture is a nice-to-have; never block clock-in on an upload failure
  }
}

export default function ClockScreen() {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => Math.floor(Date.now() / 60000));
  const [busy, setBusy] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNowMinutes(Math.floor(Date.now() / 60000)), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!profile?.defaultShopId) return;
    supabase
      .from('shops')
      .select('*')
      .eq('id', profile.defaultShopId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setShop({
          id: data.id,
          ownerId: data.owner_id,
          name: data.name,
          latitude: data.latitude,
          longitude: data.longitude,
          geofenceRadiusMeters: data.geofence_radius_meters,
          dailyLaborBudget: data.daily_labor_budget,
        });
      });
  }, [profile?.defaultShopId]);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from('shifts')
      .select('clock_in_at')
      .eq('staff_id', profile.id)
      .order('clock_in_at', { ascending: false })
      .limit(14)
      .then(({ data }) => {
        if (!data) return;
        setStreak(
          calculateOnTimeStreak(
            data.map((row: any) => ({ clockInAt: row.clock_in_at })),
            new Date().toISOString()
          )
        );
      });
  }, [profile]);

  useEffect(() => {
    getQueueLength().then(setPendingCount);
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushQueue().then((result) => setPendingCount(result.remaining));
      }
    });
    return unsubscribe;
  }, []);

  async function handleClockIn() {
    if (!profile) return;

    if (!shop) {
      Alert.alert('No shop assigned', "Ask your owner to set your default shop before clocking in.");
      return;
    }

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
        { latitude: shop.latitude, longitude: shop.longitude },
        shop.geofenceRadiusMeters
      );

      if (!withinRange) {
        Alert.alert('Out of range', "You're not close enough to the shop to clock in.");
        return;
      }

      // Android exposes a best-effort "is this a mock location provider" signal.
      // Not built: iOS spoofing detection, and blocking clock-in on a positive
      // signal (false positives on emulators/testing devices are common, so
      // this is surfaced to the owner for review instead of hard-blocking).
      const mockedLocation = Boolean(position.mocked);

      let photoPath: string | null = null;
      const photoPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (photoPermission.granted) {
        const photo = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: false });
        if (!photo.canceled && photo.assets[0]) {
          photoPath = await uploadClockInPhoto(profile.id, photo.assets[0].uri);
        }
      }

      const capturedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          staff_id: profile.id,
          shop_id: shop.id,
          paid_lunch: false,
          mocked_location: mockedLocation,
          clock_in_photo_url: photoPath,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        // Likely offline — queue it and sync once connectivity returns.
        await enqueue({
          type: 'clock_in',
          localId: `local-${Date.now()}`,
          staffId: profile.id,
          shopId: shop.id,
          paidLunch: false,
          isHoliday: false,
          mockedLocation,
          capturedAt,
        });
        setPendingCount(await getQueueLength());
        setActiveShift({
          id: `pending-${Date.now()}`,
          staffId: profile.id,
          shopId: shop.id,
          clockInAt: capturedAt,
          clockOutAt: null,
          paidLunch: false,
          isHoliday: false,
          status: 'active',
          mockedLocation,
          clockInPhotoUrl: null,
        });
        Alert.alert('Saved offline', "You're clocked in. This will sync once you're back online.");
        return;
      }

      setActiveShift({
        id: data.id,
        staffId: data.staff_id,
        shopId: data.shop_id,
        clockInAt: data.clock_in_at,
        clockOutAt: null,
        paidLunch: data.paid_lunch,
        isHoliday: data.is_holiday,
        status: 'active',
        mockedLocation: data.mocked_location,
        clockInPhotoUrl: data.clock_in_photo_url,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    if (!activeShift) return;
    setBusy(true);
    const capturedAt = new Date().toISOString();
    try {
      const isPending = activeShift.id.startsWith('pending-');
      const { error } = isPending
        ? { error: new Error('offline shift, queue instead') }
        : await supabase
            .from('shifts')
            .update({ clock_out_at: capturedAt, status: 'completed' })
            .eq('id', activeShift.id);

      if (error) {
        await enqueue({
          type: 'clock_out',
          localId: `local-${Date.now()}`,
          pairedClockInLocalId: isPending ? activeShift.id.replace('pending-', 'local-') : null,
          shiftId: isPending ? null : activeShift.id,
          capturedAt,
        });
        setPendingCount(await getQueueLength());
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
      {streak > 1 ? <Text style={styles.streak}>🔥 {streak}-day on-time streak</Text> : null}
      {pendingCount > 0 ? <Text style={styles.pending}>{pendingCount} action(s) waiting to sync</Text> : null}

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
  streak: { position: 'absolute', top: 24, fontSize: 14, color: '#c65' },
  pending: { position: 'absolute', top: 48, fontSize: 12, color: '#888' },
  button: { backgroundColor: '#111', borderRadius: 999, paddingVertical: 16, paddingHorizontal: 40 },
  buttonDanger: { backgroundColor: '#c00' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 18 },
});
