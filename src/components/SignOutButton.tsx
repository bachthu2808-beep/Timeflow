import React from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function SignOutButton() {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  function confirmSignOut() {
    Alert.alert(t('common.signOutTitle'), t('common.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
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
