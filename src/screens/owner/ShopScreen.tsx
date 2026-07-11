import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Shop } from '../../types';

export default function ShopScreen() {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('100');
  const [budget, setBudget] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
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
      });
      setName(data.name);
      setRadius(String(data.geofence_radius_meters));
      setBudget(data.daily_labor_budget != null ? String(data.daily_labor_budget) : '');
      setCoords({ latitude: data.latitude, longitude: data.longitude });
    }
  }

  useEffect(() => {
    load();
  }, [profile]);

  async function useCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location required', 'Allow location access to set the shop as your current position.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
  }

  async function save() {
    if (!profile) return;
    if (!name.trim() || !coords) {
      Alert.alert('Missing info', 'Enter a name and set the shop location first.');
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
      };

      const { error } = shop
        ? await supabase.from('shops').update(payload).eq('id', shop.id)
        : await supabase.from('shops').insert(payload);

      if (error) {
        Alert.alert('Failed to save', error.message);
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

      Alert.alert('Saved', 'Shop settings updated.');
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{shop ? 'Shop settings' : 'Set up your shop'}</Text>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Riverside Cafe" />

      <Text style={styles.label}>Geofence radius (meters)</Text>
      <TextInput style={styles.input} value={radius} onChangeText={setRadius} keyboardType="number-pad" />

      <Text style={styles.label}>Daily labor budget (optional, for the alert banner)</Text>
      <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="e.g. 200" />

      <Text style={styles.label}>Location</Text>
      <Text style={styles.coords}>
        {coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : 'Not set yet'}
      </Text>
      <Pressable style={styles.secondaryButton} onPress={useCurrentLocation}>
        <Text style={styles.secondaryButtonText}>Use my current location</Text>
      </Pressable>

      <Pressable style={styles.saveButton} onPress={save} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { color: '#888', fontSize: 12, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  coords: { fontSize: 14 },
  secondaryButton: { borderWidth: 1, borderColor: '#111', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { color: '#111', fontWeight: '600' },
  saveButton: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
});
