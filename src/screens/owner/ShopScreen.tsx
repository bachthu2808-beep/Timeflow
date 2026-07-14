import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { notify } from '../../lib/notify';
import { colors, radii, shadow, spacing } from '../../theme';
import type { Shop } from '../../types';

export default function ShopScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('100');
  const [budget, setBudget] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!profile) return;
    const { data } = await supabase.from('shops').select('*').eq('owner_id', profile.id).limit(1).maybeSingle();
    if (data) {
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
      setName(data.name);
      setRadius(String(data.geofence_radius_meters));
      setBudget(data.daily_labor_budget != null ? String(data.daily_labor_budget) : '');
      setCoords({ latitude: data.latitude, longitude: data.longitude });
      setIsOpen(data.is_open);
    }
  }

  useEffect(() => {
    load();
  }, [profile]);

  async function useCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      notify(t('owner.shop.locationRequiredTitle'), t('owner.shop.locationRequiredMessage'));
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
  }

  async function toggleOpen(next: boolean) {
    setIsOpen(next);
    if (shop) {
      await supabase.from('shops').update({ is_open: next }).eq('id', shop.id);
    }
  }

  async function save() {
    if (!profile) return;
    if (!name.trim() || !coords) {
      notify(t('common.missingInfoTitle'), t('owner.shop.missingInfoMessage'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        owner_id: profile.id,
        name: name.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        geofence_radius_meters: parseInt(radius, 10) || 100,
        daily_labor_budget: budget.trim() ? parseFloat(budget) : null,
        is_open: isOpen,
      };

      const { error } = shop
        ? await supabase.from('shops').update(payload).eq('id', shop.id)
        : await supabase.from('shops').insert(payload);

      if (error) {
        notify(t('common.failedToSaveTitle'), error.message);
        return;
      }

      // New staff should default to this shop unless the owner has multiple.
      if (!shop) {
        const { data: created } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (created) {
          await supabase.from('profiles').update({ default_shop_id: created.id }).eq('id', profile.id);
        }
      }

      notify(t('common.savedTitle'), t('owner.shop.savedMessage'));
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{shop ? t('owner.shop.settingsTitle') : t('owner.shop.setupTitle')}</Text>
          {shop ? (
            <View style={styles.openRow}>
              <Text style={styles.openLabel}>{t('owner.shop.openLabel')}</Text>
              <Switch value={isOpen} onValueChange={toggleOpen} trackColor={{ true: colors.brand }} />
            </View>
          ) : null}
        </View>

        <Text style={styles.label}>{t('owner.shop.nameLabel')}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('owner.shop.namePlaceholder')} />

        <Text style={styles.label}>{t('owner.shop.radiusLabel')}</Text>
        <TextInput style={styles.input} value={radius} onChangeText={setRadius} keyboardType="number-pad" />

        <Text style={styles.label}>{t('owner.shop.budgetLabel')}</Text>
        <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder={t('owner.shop.budgetPlaceholder')} />

        <Text style={styles.label}>{t('owner.shop.locationLabel')}</Text>
        <Text style={styles.coords}>
          {coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : t('owner.shop.locationNotSet')}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={useCurrentLocation}>
          <Text style={styles.secondaryButtonText}>{t('owner.shop.useCurrentLocation')}</Text>
        </Pressable>

        <Pressable style={styles.saveButton} onPress={save} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? t('common.saving') : t('common.save')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.xs, ...shadow },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  openLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  label: { color: colors.textMuted, fontSize: 12, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md, fontSize: 16, marginTop: spacing.xs, color: colors.textPrimary },
  coords: { fontSize: 14, marginTop: spacing.xs, color: colors.textPrimary },
  secondaryButton: { borderWidth: 1, borderColor: colors.brand, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  secondaryButtonText: { color: colors.brand, fontWeight: '700' },
  saveButton: { backgroundColor: colors.brand, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  saveButtonText: { color: '#fff', fontWeight: '700' },
});
