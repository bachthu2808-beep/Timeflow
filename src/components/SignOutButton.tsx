import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { confirm } from '../lib/confirm';

export default function SignOutButton() {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  async function confirmSignOut() {
    const ok = await confirm(t('common.signOutTitle'), t('common.signOutMessage'), t('common.cancel'), t('common.signOut'));
    if (ok) {
      signOut();
    }
  }

  return (
    <Pressable onPress={confirmSignOut} style={styles.button}>
      <Text style={styles.text}>{t('common.signOut')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 4, paddingHorizontal: 8, marginRight: 12 },
  text: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
});
