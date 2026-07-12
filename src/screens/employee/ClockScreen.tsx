import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { isWithinGeofence } from '../../lib/geofence';
import { enqueue, flushQueue, getQueueLength } from '../../lib/offlineQueue';
import { calculatePay } from '../../payroll/calculatePay';
import { calculateOnTimeStreak } from '../../payroll/streaks';
import { GENERIC_PAY_RULES } from '../../payroll/payRules';
import { formatCurrency } from '../../lib/currency';
import { colors, radii, shadow, spacing } from '../../theme';
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
  const { t } = useTranslation();
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
          isOpen: data.is_open,
        });
      });
  }, [profile?.defaultShopId]);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', profile.id)
      .eq('status', 'active')
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (!data) return;
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
      });
  }, [profile]);

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
      Alert.alert(t('employee.clock.noShopTitle'), t('employee.clock.noShopMessage'));
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('owner.shop.locationRequiredTitle'), t('employee.clock.locationRequiredMessage'));
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
        Alert.alert(t('employee.clock.outOfRangeTitle'), t('employee.clock.outOfRangeMessage'));
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
        Alert.alert(t('employee.clock.savedOfflineTitle'), t('employee.clock.savedOfflineMessage'));
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
      Alert.alert(t('employee.clock.shiftEndedTitle'), t('employee.clock.shiftEndedMessage'));
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
      <View style={styles.badgeStack}>
        {streak > 1 ? (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>{t('employee.clock.streak', { count: streak })}</Text>
          </View>
        ) : null}
        {pendingCount > 0 ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{t('employee.clock.pendingSync', { count: pendingCount })}</Text>
          </View>
        ) : null}
      </View>

      {activeShift ? (
        <>
          <Text style={styles.label}>{t('employee.clock.currentlyClockedIn')}</Text>
          <Text style={styles.earnings}>{formatCurrency(livePay?.totalPay ?? 0)}</Text>
          <Pressable style={[styles.button, styles.buttonDanger]} onPress={handleClockOut} disabled={busy}>
            <Text style={styles.buttonText}>{t('employee.clock.clockOut')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>{t('employee.clock.notClockedIn')}</Text>
          <Pressable style={styles.button} onPress={handleClockIn} disabled={busy}>
            <Text style={styles.buttonText}>{t('employee.clock.clockIn')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  label: { fontSize: 16, color: colors.textSecondary },
  earnings: { fontSize: 44, fontWeight: '800', color: colors.textPrimary, fontFamily: 'monospace' },
  badgeStack: { position: 'absolute', top: 32, alignItems: 'center', gap: spacing.xs },
  streakBadge: { backgroundColor: colors.statusLateBg, borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 14 },
  streakText: { color: colors.statusLate, fontWeight: '700', fontSize: 13 },
  pendingBadge: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 12, ...shadow },
  pendingText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  button: { backgroundColor: colors.brand, borderRadius: radii.pill, paddingVertical: 18, paddingHorizontal: 48, ...shadow },
  buttonDanger: { backgroundColor: colors.danger },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 18 },
});
