import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';

type Mode = 'owner' | 'employee';

interface Props {
  onBackToLogin: () => void;
}

export default function SignUpScreen({ onBackToLogin }: Props) {
  const [mode, setMode] = useState<Mode>('owner');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    setError(null);

    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Enter your name, email, and a password of at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError || !data.user) {
        setError(signUpError?.message ?? 'Sign up failed.');
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
          setError("No pending invitation found for this email. Ask your owner to invite you first.");
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
      <Text style={styles.title}>Create your account</Text>

      <View style={styles.modeRow}>
        <Pressable style={[styles.modeChip, mode === 'owner' && styles.modeChipSelected]} onPress={() => setMode('owner')}>
          <Text style={mode === 'owner' ? styles.modeTextSelected : styles.modeText}>I'm the owner</Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, mode === 'employee' && styles.modeChipSelected]}
          onPress={() => setMode('employee')}
        >
          <Text style={mode === 'employee' ? styles.modeTextSelected : styles.modeText}>I'm joining a shop</Text>
        </Pressable>
      </View>

      {mode === 'employee' ? (
        <Text style={styles.hint}>
          Your owner needs to invite you by email first (Roster → Invite staff) before you can sign up here.
        </Text>
      ) : null}

      <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSignUp} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
      </Pressable>

      <Pressable onPress={onBackToLogin}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 8 },
  modeChip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  modeChipSelected: { backgroundColor: '#111', borderColor: '#111' },
  modeText: { color: '#111' },
  modeTextSelected: { color: '#fff' },
  hint: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#c00' },
  link: { color: '#06c', textAlign: 'center', marginTop: 12 },
});
