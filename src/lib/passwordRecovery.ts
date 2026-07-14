import { Platform } from 'react-native';
import { supabase } from './supabase';

function parseRecoveryHash(): { accessToken: string; refreshToken: string } | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash || !hash.includes('type=recovery')) return null;

  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
}

/**
 * The app disables Supabase's automatic URL session detection (see
 * supabase.ts) so it doesn't misfire on other links (e.g. the sign-up
 * confirmation email). That means a password-reset email's link — which
 * lands back here with the recovery tokens in the URL fragment — needs to
 * be picked up manually. Returns true if this load was a recovery link,
 * after establishing the session it grants and stripping the tokens out of
 * the visible URL so a refresh doesn't try to reprocess them.
 */
export async function consumePasswordRecoveryLink(): Promise<boolean> {
  const tokens = parseRecoveryHash();
  if (!tokens) return false;

  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  return !error;
}
