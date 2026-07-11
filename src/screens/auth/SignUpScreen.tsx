import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { colors, radii, shadow, spacing } from '../../theme';

type Mode = 'owner' | 'employee';

interface Props {
  onBackToLogin: () => void;
}

export default function SignUpScreen({ onBackToLogin }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('owner');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    setError(null);

    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError(t('auth.signup.validationError'));
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError || !data.user) {
        setError(signUpError?.message ?? t('auth.signup.signUpFailed'));
        return;
      }

      if (mode === 'owner') {
        const { error: rpcError } = await supabase.rpc('create_owner_profile', { p_full_name: fullName });
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
      } else {
        const { data: invitation, error: findError } = await supabase
          .from('staff_invitations')
          .select('id')
          .eq('email', email)
          .is('consumed_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (findError || !invitation) {
          setError(t('auth.signup.noInvitation'));
          return;
        }

        const { error: rpcError } = await supabase.rpc('accept_staff_invitation', {
          invitation_id: invitation.id,
        });
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.signup.title')}</Text>

      <View style={styles.modeRow}>
        <Pressable style={[styles.modeChip, mode === 'owner' && styles.modeChipSelected]} onPress={() => setMode('owner')}>
          <Text style={mode === 'owner' ? styles.modeTextSelected : styles.modeText}>{t('auth.signup.modeOwner')}</Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, mode === 'employee' && styles.modeChipSelected]}
          onPress={() => setMode('employee')}
        >
          <Text style={mode === 'employee' ? styles.modeTextSelected : styles.modeText}>{t('auth.signup.modeEmployee')}</Text>
        </Pressable>
      </View>

      {mode === 'employee' ? (
        <Text style={styles.hint}>{t('auth.signup.employeeHint')}</Text>
      ) : null}

      <TextInput style={styles.input} placeholder={t('auth.signup.fullNamePlaceholder')} value={fullName} onChangeText={setFullName} />
      <TextInput
        style={styles.input}
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder={t('auth.passwordPlaceholder')} secureTextEntry value={password} onChangeText={setPassword} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSignUp} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.signup.createAccount')}</Text>}
      </Pressable>

      <Pressable onPress={onBackToLogin}>
        <Text style={styles.link}>{t('auth.signup.backToSignIn')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', marginBottom: spacing.sm, textAlign: 'center', color: colors.textPrimary },
  modeRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.sm },
  modeChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 14 },
  modeChipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  modeText: { color: colors.textPrimary },
  modeTextSelected: { color: '#fff' },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md, fontSize: 16, backgroundColor: colors.surface, color: colors.textPrimary },
  button: { backgroundColor: colors.brand, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm, ...shadow },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger },
  link: { color: colors.link, textAlign: 'center', marginTop: spacing.md },
});
