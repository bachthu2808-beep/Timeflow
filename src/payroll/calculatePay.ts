import { PayRuleSet } from './payRules';

export interface Shift {
  /** Minutes since epoch (or any shared origin) when the shift started. */
  clockInMinutes: number;
  /** Minutes since the same origin when the shift ended, or null if still clocked in. */
  clockOutMinutes: number | null;
  /** Whether this shift has a paid lunch allowance (skips the unpaid-lunch deduction). */
  paidLunch: boolean;
}

export interface PayInput {
  basis: 'hourly' | 'monthly';
  hourlyRate?: number;
  monthlyRate?: number;
  lunchAllowancePerShift?: number;
  shifts: Shift[];
  rules: PayRuleSet;
  /** Minutes since the same origin as shifts, used to value in-progress shifts. Defaults to now. */
  nowMinutes?: number;
}

export interface PayResult {
  regularMinutes: number;
  overtimeMinutes: number;
  regularPay: number;
  overtimePay: number;
  lunchAllowance: number;
  totalPay: number;
}

function roundMinutes(minutes: number, roundTo: number): number {
  if (roundTo <= 0) {
    return minutes;
  }
  return Math.round(minutes / roundTo) * roundTo;
}

export function calculateShiftMinutes(shift: Shift, rules: PayRuleSet, nowMinutes: number): number {
  const end = shift.clockOutMinutes ?? nowMinutes;
  let worked = Math.max(0, end - shift.clockInMinutes);

  if (!shift.paidLunch) {
    worked = Math.max(0, worked - rules.unpaidLunchMinutes);
  }

  return roundMinutes(worked, rules.roundingMinutes);
}

function splitRegularAndOvertime(totalMinutes: number, rules: PayRuleSet) {
  const tiers = [...rules.overtimeTiers].sort((a, b) => a.afterMinutes - b.afterMinutes);

  if (tiers.length === 0) {
    return { regularMinutes: totalMinutes, overtimeMinutesByTier: [] as { minutes: number; multiplier: number }[] };
  }

  const regularMinutes = Math.min(totalMinutes, tiers[0].afterMinutes);
  let remaining = Math.max(0, totalMinutes - tiers[0].afterMinutes);
  const overtimeMinutesByTier: { minutes: number; multiplier: number }[] = [];

  for (let i = 0; i < tiers.length && remaining > 0; i += 1) {
    const tier = tiers[i];
    const nextBoundary = tiers[i + 1]?.afterMinutes;
    const tierMinutes = nextBoundary ? Math.min(remaining, nextBoundary - tier.afterMinutes) : remaining;
    overtimeMinutesByTier.push({ minutes: tierMinutes, multiplier: tier.multiplier });
    remaining -= tierMinutes;
  }

  return { regularMinutes, overtimeMinutesByTier };
}

export function calculatePay(input: PayInput): PayResult {
  const nowMinutes = input.nowMinutes ?? Math.floor(Date.now() / 60000);
  const rules = input.rules;

  let totalWorkedMinutes = 0;
  let lunchAllowance = 0;

  for (const shift of input.shifts) {
    totalWorkedMinutes += calculateShiftMinutes(shift, rules, nowMinutes);
    if (shift.paidLunch && input.lunchAllowancePerShift) {
      lunchAllowance += input.lunchAllowancePerShift;
    }
  }

  if (input.basis === 'monthly') {
    const regularPay = input.monthlyRate ?? 0;
    return {
      regularMinutes: totalWorkedMinutes,
      overtimeMinutes: 0,
      regularPay,
      overtimePay: 0,
      lunchAllowance,
      totalPay: regularPay + lunchAllowance,
    };
  }

  const hourlyRate = input.hourlyRate ?? 0;
  const { regularMinutes, overtimeMinutesByTier = [] } = splitRegularAndOvertime(totalWorkedMinutes, rules);

  const overtimeMinutes = overtimeMinutesByTier.reduce((sum, tier) => sum + tier.minutes, 0);
  const overtimePay = overtimeMinutesByTier.reduce(
    (sum, tier) => sum + (tier.minutes / 60) * hourlyRate * tier.multiplier,
    0
  );
  const regularPay = (regularMinutes / 60) * hourlyRate;

  return {
    regularMinutes,
    overtimeMinutes,
    regularPay,
    overtimePay,
    lunchAllowance,
    totalPay: regularPay + overtimePay + lunchAllowance,
  };
}
