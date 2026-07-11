import { computeWeeklyLaborCost } from './weeklyLaborCost';

function minutesAt(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 60000);
}

describe('computeWeeklyLaborCost', () => {
  // Monday 2026-01-05
  const weekStart = new Date('2026-01-05T00:00:00Z');

  it('buckets shifts into the correct day of a Mon-Sun week', () => {
    const shifts = [
      // Monday: 4h at $20/hr = $80
      { hourlyRate: 20, clockInMinutes: minutesAt('2026-01-05T09:00:00Z'), clockOutMinutes: minutesAt('2026-01-05T13:00:00Z') },
      // Wednesday: 2h at $10/hr = $20
      { hourlyRate: 10, clockInMinutes: minutesAt('2026-01-07T09:00:00Z'), clockOutMinutes: minutesAt('2026-01-07T11:00:00Z') },
    ];

    const result = computeWeeklyLaborCost(shifts, weekStart, minutesAt('2026-01-11T00:00:00Z'));

    expect(result).toHaveLength(7);
    expect(result[0]).toBe(80); // Monday
    expect(result[1]).toBe(0); // Tuesday
    expect(result[2]).toBe(20); // Wednesday
    expect(result[3]).toBe(0); // Thursday
  });

  it('returns all zeros for a week with no shifts', () => {
    const result = computeWeeklyLaborCost([], weekStart, minutesAt('2026-01-11T00:00:00Z'));
    expect(result).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('values an in-progress shift up to nowMinutes', () => {
    const shifts = [
      { hourlyRate: 30, clockInMinutes: minutesAt('2026-01-05T09:00:00Z'), clockOutMinutes: null },
    ];
    const nowMinutes = minutesAt('2026-01-05T10:30:00Z'); // 1.5h in
    const result = computeWeeklyLaborCost(shifts, weekStart, nowMinutes);
    expect(result[0]).toBe(45);
  });
});
