export interface LaborCostEntry {
  hourlyRate: number | null;
  clockInMinutes: number;
  clockOutMinutes: number | null;
}

/**
 * Fast running estimate of labor cost for a set of shifts, at plain hourly
 * rate (no overtime tiering — this is a live dashboard signal, not a payroll
 * calculation; use calculatePay() for the authoritative payslip figure).
 */
export function estimateLaborCost(entries: LaborCostEntry[], nowMinutes: number): number {
  return entries.reduce((total, entry) => {
    if (entry.hourlyRate === null) {
      return total;
    }
    const end = entry.clockOutMinutes ?? nowMinutes;
    const minutes = Math.max(0, end - entry.clockInMinutes);
    return total + (minutes / 60) * entry.hourlyRate;
  }, 0);
}
