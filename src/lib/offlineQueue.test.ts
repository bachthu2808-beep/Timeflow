jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest')
);

const mockInsert = jest.fn();
const mockUpdate = jest.fn();

jest.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (payload: any) => ({
        select: () => ({
          single: async () => mockInsert(table, payload),
        }),
      }),
      update: (payload: any) => ({
        eq: async (column: string, value: string) => mockUpdate(table, payload, column, value),
      }),
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueue, flushQueue, getQueueLength } from './offlineQueue';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockInsert.mockReset();
  mockUpdate.mockReset();
});

describe('offlineQueue', () => {
  it('queues actions and reports the queue length', async () => {
    await enqueue({
      type: 'clock_in',
      localId: 'local-1',
      staffId: 'staff-1',
      shopId: 'shop-1',
      paidLunch: false,
      isHoliday: false,
      mockedLocation: false,
      capturedAt: '2026-01-10T09:00:00.000Z',
    });

    expect(await getQueueLength()).toBe(1);
  });

  it('syncs a paired clock-in/clock-out pair in order, resolving the shift id from the clock-in result', async () => {
    mockInsert.mockResolvedValue({ data: { id: 'server-shift-1' }, error: null });
    mockUpdate.mockResolvedValue({ data: null, error: null });

    await enqueue({
      type: 'clock_in',
      localId: 'local-1',
      staffId: 'staff-1',
      shopId: 'shop-1',
      paidLunch: false,
      isHoliday: false,
      mockedLocation: false,
      capturedAt: '2026-01-10T09:00:00.000Z',
    });
    await enqueue({
      type: 'clock_out',
      localId: 'local-2',
      pairedClockInLocalId: 'local-1',
      shiftId: null,
      capturedAt: '2026-01-10T17:00:00.000Z',
    });

    const result = await flushQueue();

    expect(result).toEqual({ synced: 2, remaining: 0 });
    expect(await getQueueLength()).toBe(0);
    expect(mockUpdate).toHaveBeenCalledWith(
      'shifts',
      { clock_out_at: '2026-01-10T17:00:00.000Z', status: 'completed' },
      'id',
      'server-shift-1'
    );
  });

  it('stops at the first failure and keeps the remaining items queued for retry', async () => {
    mockInsert.mockResolvedValueOnce({ data: null, error: new Error('offline') });

    await enqueue({
      type: 'clock_in',
      localId: 'local-1',
      staffId: 'staff-1',
      shopId: 'shop-1',
      paidLunch: false,
      isHoliday: false,
      mockedLocation: false,
      capturedAt: '2026-01-10T09:00:00.000Z',
    });

    const result = await flushQueue();

    expect(result).toEqual({ synced: 0, remaining: 1 });
    expect(await getQueueLength()).toBe(1);
  });

  it('syncs an already-synced clock-out directly against its known shiftId', async () => {
    mockUpdate.mockResolvedValue({ data: null, error: null });

    await enqueue({
      type: 'clock_out',
      localId: 'local-2',
      pairedClockInLocalId: null,
      shiftId: 'server-shift-9',
      capturedAt: '2026-01-10T17:00:00.000Z',
    });

    const result = await flushQueue();

    expect(result).toEqual({ synced: 1, remaining: 0 });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
