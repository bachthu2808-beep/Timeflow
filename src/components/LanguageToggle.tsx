import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage, SupportedLanguage } from '../i18n';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language as SupportedLanguage;

  return (
    <View style={styles.row}>
      <Pressable onPress={() => setLanguage('en')} style={[styles.chip, current === 'en' && styles.chipActive]}>
        <Text style={[styles.text, current === 'en' && styles.textActive]}>EN</Text>
      </Pressable>
      <Pressable onPress={() => setLanguage('vi')} style={[styles.chip, current === 'vi' && styles.chipActive]}>
        <Text style={[styles.text, current === 'vi' && styles.textActive]}>VI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, marginRight: 12 },
  chip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ccc' },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  text: { fontSize: 12, fontWeight: '600', color: '#111' },
  textActive: { color: '#fff' },
});
