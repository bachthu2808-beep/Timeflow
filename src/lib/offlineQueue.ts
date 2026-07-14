import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const QUEUE_KEY = 'timeflow.offline_queue.v1';
// Maps a synced clock-in's localId to its server-assigned shift id, kept
// around after the clock-in is removed from the queue so a still-pending
// paired clock-out (processed in a later flushQueue() call, or blocked by an
// unrelated failure earlier in the same call) can still resolve it. Without
// this, a clock-in that synced but whose clock-out didn't sync in the exact
// same pass would lose the only place that mapping lived — the clock-out
// would then have no way to ever find its shift id and would jam the queue
// forever.
const SYNCED_CLOCK_IN_IDS_KEY = 'timeflow.offline_queue.synced_clock_in_ids.v1';

export interface ClockInAction {
  type: 'clock_in';
  localId: string;
  staffId: string;
  shopId: string;
  paidLunch: boolean;
  isHoliday: boolean;
  mockedLocation: boolean;
  capturedAt: string;
}

export interface ClockOutAction {
  type: 'clock_out';
  localId: string;
  /** localId of the paired clock_in action, if that shift hasn't synced to the server yet. */
  pairedClockInLocalId: string | null;
  /** Server-side shift id, if the clock-in already synced before this clock-out was queued. */
  shiftId: string | null;
  capturedAt: string;
}

export type QueuedAction = ClockInAction | ClockOutAction;

async function readQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function readSyncedClockInIds(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(SYNCED_CLOCK_IN_IDS_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function writeSyncedClockInIds(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(SYNCED_CLOCK_IN_IDS_KEY, JSON.stringify(map));
}

export async function enqueue(action: QueuedAction): Promise<void> {
  const queue = await readQueue();
  queue.push(action);
  await writeQueue(queue);
}

export async function getQueueLength(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Processes the queue in order, stopping at the first failure (still offline,
 * or a real error) so the remaining items stay queued in their original order
 * for the next retry.
 */
export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = await readQueue();
  const syncedClockInIds = await readSyncedClockInIds();
  const localIdToServerId = new Map<string, string>(Object.entries(syncedClockInIds));
  let synced = 0;

  for (let i = 0; i < queue.length; i += 1) {
    const action = queue[i];

    try {
      if (action.type === 'clock_in') {
        const { data, error } = await supabase
          .from('shifts')
          .insert({
            staff_id: action.staffId,
            shop_id: action.shopId,
            paid_lunch: action.paidLunch,
            is_holiday: action.isHoliday,
            mocked_location: action.mockedLocation,
            clock_in_at: action.capturedAt,
            status: 'active',
          })
          .select()
          .single();

        if (error) throw error;
        localIdToServerId.set(action.localId, data.id);
        syncedClockInIds[action.localId] = data.id;
        await writeSyncedClockInIds(syncedClockInIds);
      } else {
        const shiftId =
          action.shiftId ??
          (action.pairedClockInLocalId ? localIdToServerId.get(action.pairedClockInLocalId) : null);

        if (!shiftId) {
          throw new Error('clock-out has no resolvable shift id yet');
        }

        const { error } = await supabase
          .from('shifts')
          .update({ clock_out_at: action.capturedAt, status: 'completed' })
          .eq('id', shiftId);

        if (error) throw error;

        // This clock-out is the only thing that ever needed the mapping —
        // once it's synced, drop it so the persisted map doesn't grow forever.
        if (action.pairedClockInLocalId) {
          delete syncedClockInIds[action.pairedClockInLocalId];
          await writeSyncedClockInIds(syncedClockInIds);
        }
      }

      synced += 1;
    } catch (error) {
      console.error('[offlineQueue] failed to sync action', action.type, action.localId, error);
      const remaining = queue.slice(i);
      await writeQueue(remaining);
      return { synced, remaining: remaining.length };
    }
  }

  await writeQueue([]);
  return { synced, remaining: 0 };
}
