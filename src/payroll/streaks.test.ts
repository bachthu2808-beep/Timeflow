import { calculateOnTimeStreak } from './streaks';

function day(offsetDays: number, hour: number, minute = 0): string {
  const base = new Date('2026-01-10T00:00:00Z');
  base.setUTCDate(base.getUTCDate() + offsetDays);
  base.setUTCHours(hour, minute, 0, 0);
  return base.toISOString();
}

describe('calculateOnTimeStreak', () => {
  it('returns 0 for no shifts', () => {
    expect(calculateOnTimeStreak([], day(0, 9))).toBe(0);
  });

  it('counts consecutive days clocked in within the grace window, most recent first', () => {
    const shifts = [
      { clockInAt: day(-2, 8, 55) }, // on time
      { clockInAt: day(-1, 9, 2) }, // within 5-min grace
      { clockInAt: day(0, 8, 50) }, // on time
    ];

    expect(calculateOnTimeStreak(shifts, day(0, 9), { scheduledHour: 9, graceMinutes: 5 })).toBe(3);
  });

  it('breaks the streak on a late clock-in', () => {
    const shifts = [
      { clockInAt: day(-2, 8, 55) },
      { clockInAt: day(-1, 9, 20) }, // late, breaks streak
      { clockInAt: day(0, 8, 50) },
    ];

    expect(calculateOnTimeStreak(shifts, day(0, 9), { scheduledHour: 9, graceMinutes: 5 })).toBe(1);
  });

  it('breaks the streak on a missed day (gap of more than one calendar day)', () => {
    const shifts = [
      { clockInAt: day(-3, 8, 55) },
      { clockInAt: day(0, 8, 50) }, // gap: no shift on day -2 or -1
    ];

    expect(calculateOnTimeStreak(shifts, day(0, 9), { scheduledHour: 9, graceMinutes: 5 })).toBe(1);
  });
});
