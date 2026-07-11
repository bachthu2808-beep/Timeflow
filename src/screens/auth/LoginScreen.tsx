import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import LanguageToggle from '../../components/LanguageToggle';
import { colors, radii, shadow, spacing } from '../../theme';

interface Props {
  onSignUp: () => void;
}

export default function LoginScreen({ onSignUp }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.languageRow}>
        <LanguageToggle />
      </View>
      <Text style={styles.title}>bt28staff</Text>
      <TextInput
        style={styles.input}
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={handleSignIn} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.login.signIn')}</Text>}
      </Pressable>
      <Pressable onPress={onSignUp}>
        <Text style={styles.link}>{t('auth.login.signUpLink')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  languageRow: { position: 'absolute', top: 60, right: 12, flexDirection: 'row' },
  title: { fontSize: 30, fontWeight: '800', marginBottom: spacing.xl, textAlign: 'center', color: colors.brand },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md, fontSize: 16, backgroundColor: colors.surface, color: colors.textPrimary },
  button: { backgroundColor: colors.brand, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm, ...shadow },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger },
  link: { color: colors.link, textAlign: 'center', marginTop: spacing.lg },
});
