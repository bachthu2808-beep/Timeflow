import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { notify } from '../../lib/notify';
import { colors, radii, shadow, spacing } from '../../theme';

interface Props {
  onDone: () => void;
}

export default function ResetPasswordScreen({ onDone }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (password.length < 6) {
      setError(t('auth.resetPassword.tooShortError'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.mismatchError'));
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      notify(t('auth.resetPassword.successTitle'), t('auth.resetPassword.successMessage'));
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.resetPassword.title')}</Text>
      <Text style={styles.subtitle}>{t('auth.resetPassword.subtitle')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.resetPassword.submit')}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', color: colors.textPrimary },
  subtitle: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md, fontSize: 16, backgroundColor: colors.surface, color: colors.textPrimary },
  button: { backgroundColor: colors.brand, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm, ...shadow },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger },
});
