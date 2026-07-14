import { useEffect, useId, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function usePendingApprovalsCount(): number {
  const { profile } = useAuth();
  const [count, setCount] = useState(0);
  const instanceId = useId();

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const { count: approvalsCount } = await supabase
        .from('approval_requests')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', profile!.id)
        .eq('status', 'pending');
      const { count: swapsCount } = await supabase
        .from('swap_requests')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', profile!.id)
        .eq('status', 'accepted');
      setCount((approvalsCount ?? 0) + (swapsCount ?? 0));
    }

    load();
    // Channel name must be unique per mounted instance — this hook is called
    // from both OwnerTabs (badge) and OwnerDashboardScreen (banner) at the
    // same time, and a shared static name collides with an already-subscribed
    // channel, throwing "cannot add postgres_changes callbacks after subscribe()".
    const channel = supabase
      .channel(`pending-approvals-badge-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, instanceId]);

  return count;
}
