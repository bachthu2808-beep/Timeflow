export interface LateArrivalInput {
  staffId: string;
  staffName: string;
  jobTitle: string | null;
  clockInMinutes: number;
  scheduledStartMinutes: number;
  hourlyRate: number | null;
}

export interface LateArrival {
  staffId: string;
  staffName: string;
  jobTitle: string | null;
  clockInMinutes: number;
  lateMinutes: number;
  costImpact: number | null;
}

/**
 * Flags staff whose clock-in today came in past the grace window and sizes
 * the cost of the lateness at their own hourly rate (a dashboard signal, not
 * a payroll deduction — the employee is still paid for time actually
 * worked). Sorted latest-first so the worst offenders surface at the top.
 */
export function computeLateArrivals(entries: LateArrivalInput[], graceMinutes: number): LateArrival[] {
  return entries
    .map((entry) => ({ ...entry, lateMinutes: entry.clockInMinutes - entry.scheduledStartMinutes }))
    .filter((entry) => entry.lateMinutes > graceMinutes)
    .map((entry) => ({
      staffId: entry.staffId,
      staffName: entry.staffName,
      jobTitle: entry.jobTitle,
      clockInMinutes: entry.clockInMinutes,
      lateMinutes: entry.lateMinutes,
      costImpact: entry.hourlyRate !== null ? (entry.lateMinutes / 60) * entry.hourlyRate : null,
    }))
    .sort((a, b) => b.lateMinutes - a.lateMinutes);
}
