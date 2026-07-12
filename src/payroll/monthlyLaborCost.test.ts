import { computeMonthlyLaborCost } from './monthlyLaborCost';

function minutesAt(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 60000);
}

describe('computeMonthlyLaborCost', () => {
  const monthStart = new Date('2026-07-01T00:00:00Z');

  it('buckets shifts into the correct day-of-month', () => {
    const shifts = [
      // Jul 1: 4h at $20/hr = $80
      { hourlyRate: 20, clockInMinutes: minutesAt('2026-07-01T09:00:00Z'), clockOutMinutes: minutesAt('2026-07-01T13:00:00Z') },
      // Jul 13: 2h at $10/hr = $20
      { hourlyRate: 10, clockInMinutes: minutesAt('2026-07-13T09:00:00Z'), clockOutMinutes: minutesAt('2026-07-13T11:00:00Z') },
    ];

    const result = computeMonthlyLaborCost(shifts, monthStart, 13, minutesAt('2026-07-13T18:00:00Z'));

    expect(result).toHaveLength(13);
    expect(result[0]).toBe(80); // Jul 1
    expect(result[1]).toBe(0); // Jul 2
    expect(result[12]).toBe(20); // Jul 13
  });

  it('ignores shifts outside the requested day range', () => {
    const shifts = [
      { hourlyRate: 20, clockInMinutes: minutesAt('2026-07-20T09:00:00Z'), clockOutMinutes: minutesAt('2026-07-20T13:00:00Z') },
    ];

    const result = computeMonthlyLaborCost(shifts, monthStart, 13, minutesAt('2026-07-13T18:00:00Z'));

    expect(result.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('values an in-progress shift up to nowMinutes', () => {
    const shifts = [{ hourlyRate: 30, clockInMinutes: minutesAt('2026-07-13T09:00:00Z'), clockOutMinutes: null }];
    const nowMinutes = minutesAt('2026-07-13T10:30:00Z'); // 1.5h in

    const result = computeMonthlyLaborCost(shifts, monthStart, 13, nowMinutes);

    expect(result[12]).toBe(45);
  });
});
