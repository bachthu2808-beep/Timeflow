import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const QUEUE_KEY = 'timeflow.offline_queue.v1';

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
  const localIdToServerId = new Map<string, string>();
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
      }

      synced += 1;
    } catch {
      const remaining = queue.slice(i);
      await writeQueue(remaining);
      return { synced, remaining: remaining.length };
    }
  }

  await writeQueue([]);
  return { synced, remaining: 0 };
}
