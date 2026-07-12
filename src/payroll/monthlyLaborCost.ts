import { estimateLaborCost, LaborCostEntry } from './laborCost';

const MINUTES_PER_DAY = 24 * 60;

/**
 * Buckets shifts into a run of calendar days starting at `monthStart` (the
 * 1st of the target month, midnight) and returns the labor cost per day.
 * `dayCount` is the number of days to bucket — callers pass "today's
 * date-of-month" so the series only covers days elapsed so far, not the
 * whole month ahead.
 */
export function computeMonthlyLaborCost(
  entries: LaborCostEntry[],
  monthStart: Date,
  dayCount: number,
  nowMinutes: number
): number[] {
  const monthStartMinutes = Math.floor(monthStart.getTime() / 60000);
  const buckets: LaborCostEntry[][] = Array.from({ length: dayCount }, () => []);

  for (const entry of entries) {
    const dayIndex = Math.floor((entry.clockInMinutes - monthStartMinutes) / MINUTES_PER_DAY);
    if (dayIndex >= 0 && dayIndex < dayCount) {
      buckets[dayIndex].push(entry);
    }
  }

  return buckets.map((bucket) => estimateLaborCost(bucket, nowMinutes));
}
