import { estimateLaborCost, LaborCostEntry } from './laborCost';

const MINUTES_PER_DAY = 24 * 60;

/**
 * Buckets shifts into a Mon–Sun week (7 numbers) and returns the labor cost
 * per day. `weekStart` should be midnight on the Monday of the target week.
 */
export function computeWeeklyLaborCost(
  entries: LaborCostEntry[],
  weekStart: Date,
  nowMinutes: number
): number[] {
  const weekStartMinutes = Math.floor(weekStart.getTime() / 60000);
  const buckets: LaborCostEntry[][] = Array.from({ length: 7 }, () => []);

  for (const entry of entries) {
    const dayIndex = Math.floor((entry.clockInMinutes - weekStartMinutes) / MINUTES_PER_DAY);
    if (dayIndex >= 0 && dayIndex < 7) {
      buckets[dayIndex].push(entry);
    }
  }

  return buckets.map((bucket) => estimateLaborCost(bucket, nowMinutes));
}
