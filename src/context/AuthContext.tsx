import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { notify } from '../lib/notify';
import type { Profile } from '../types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    ownerId: data.owner_id,
    role: data.role,
    fullName: data.full_name,
    jobTitle: data.job_title,
    payBasis: data.pay_basis,
    hourlyRate: data.hourly_rate,
    monthlyRate: data.monthly_rate,
    lunchAllowancePerShift: data.lunch_allowance_per_shift,
    payRuleSetId: data.pay_rule_set_id,
    defaultShopId: data.default_shop_id,
    expoPushToken: data.expo_push_token,
    deactivatedAt: data.deactivated_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    const userId = session.user.id;
    let cancelled = false;

    async function handleDeactivation() {
      // Keep profileLoading true (and profile null) until signOut() flips the
      // session to null too, so RootNavigator's spinner covers this whole
      // transition instead of briefly rendering the wrong tab set.
      setProfile(null);
      try {
        await supabase.auth.signOut();
        notify(i18n.t('auth.accountRemovedTitle'), i18n.t('auth.accountRemovedMessage'));
      } catch {
        // Couldn't reach Supabase (offline) — leave profileLoading true so the
        // spinner keeps showing instead of rendering a tab set with a null
        // profile. The next reconnect (or app reopen) gets another chance.
      }
    }

    setProfileLoading(true);
    fetchProfile(userId).then((result) => {
      if (cancelled) return;
      if (result?.deactivatedAt) {
        handleDeactivation();
        return;
      }
      setProfile(result);
      setProfileLoading(false);
    });

    // The one-time fetch above only catches deactivation that already
    // happened before this session loaded. Without this, an app instance
    // that's already open when the owner removes the employee would never
    // notice — token refreshes don't change session.user.id, so the effect
    // wouldn't re-run. This subscription catches it live, mid-session.
    const channel = supabase
      .channel(`profile-deactivation-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          if (cancelled) return;
          if ((payload.new as { deactivated_at: string | null }).deactivated_at) {
            handleDeactivation();
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      profileLoading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
