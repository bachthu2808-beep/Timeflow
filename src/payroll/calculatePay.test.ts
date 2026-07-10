import { calculatePay, calculateShiftMinutes, Shift } from './calculatePay';
import { PayRuleSet, GENERIC_PAY_RULES } from './payRules';

const rules: PayRuleSet = {
  id: 'test',
  currency: 'USD',
  overtimeTiers: [{ afterMinutes: 8 * 60, multiplier: 1.5 }],
  unpaidLunchMinutes: 30,
  roundingMinutes: 5,
};

const noRoundingRules: PayRuleSet = { ...rules, roundingMinutes: 0 };

describe('calculateShiftMinutes', () => {
  it('deducts unpaid lunch when the shift has no paid lunch allowance', () => {
    const shift: Shift = { clockInMinutes: 0, clockOutMinutes: 240, paidLunch: false };
    expect(calculateShiftMinutes(shift, noRoundingRules, 0)).toBe(210); // 240 - 30
  });

  it('does not deduct lunch when the shift has a paid lunch allowance', () => {
    const shift: Shift = { clockInMinutes: 0, clockOutMinutes: 240, paidLunch: true };
    expect(calculateShiftMinutes(shift, noRoundingRules, 0)).toBe(240);
  });

  it('uses nowMinutes for an in-progress shift (clockOutMinutes is null)', () => {
    const shift: Shift = { clockInMinutes: 100, clockOutMinutes: null, paidLunch: true };
    expect(calculateShiftMinutes(shift, noRoundingRules, 160)).toBe(60);
  });

  it('rounds worked minutes to the nearest roundingMinutes', () => {
    const shift: Shift = { clockInMinutes: 0, clockOutMinutes: 122, paidLunch: true };
    expect(calculateShiftMinutes(shift, rules, 0)).toBe(120); // rounds to nearest 5
  });

  it('never returns negative minutes when lunch deduction exceeds worked time', () => {
    const shift: Shift = { clockInMinutes: 0, clockOutMinutes: 10, paidLunch: false };
    expect(calculateShiftMinutes(shift, noRoundingRules, 0)).toBe(0);
  });
});

describe('calculatePay - hourly', () => {
  it('pays regular rate with no overtime for a shift under the threshold', () => {
    const result = calculatePay({
      basis: 'hourly',
      hourlyRate: 20,
      shifts: [{ clockInMinutes: 0, clockOutMinutes: 4 * 60, paidLunch: true }],
      rules: noRoundingRules,
    });

    expect(result.regularMinutes).toBe(240);
    expect(result.overtimeMinutes).toBe(0);
    expect(result.regularPay).toBe(80); // 4h * $20
    expect(result.overtimePay).toBe(0);
    expect(result.totalPay).toBe(80);
  });

  it('splits pay across a single overtime tier', () => {
    const result = calculatePay({
      basis: 'hourly',
      hourlyRate: 20,
      shifts: [{ clockInMinutes: 0, clockOutMinutes: 10 * 60, paidLunch: true }], // 10h worked
      rules: noRoundingRules,
    });

    expect(result.regularMinutes).toBe(480); // 8h regular
    expect(result.overtimeMinutes).toBe(120); // 2h OT
    expect(result.regularPay).toBe(160); // 8 * 20
    expect(result.overtimePay).toBe(60); // 2 * 20 * 1.5
    expect(result.totalPay).toBe(220);
  });

  it('sums pay across multiple shifts in a period', () => {
    const result = calculatePay({
      basis: 'hourly',
      hourlyRate: 15,
      lunchAllowancePerShift: 5,
      shifts: [
        { clockInMinutes: 0, clockOutMinutes: 4 * 60, paidLunch: true },
        { clockInMinutes: 1000, clockOutMinutes: 1000 + 4 * 60, paidLunch: true },
      ],
      rules: noRoundingRules,
    });

    expect(result.regularMinutes).toBe(480); // 4h + 4h, under 8h OT threshold
    expect(result.lunchAllowance).toBe(10); // 2 shifts * $5
    expect(result.totalPay).toBe(120 + 10); // 8h * $15 + lunch
  });

  it('computes live pay for an in-progress shift using nowMinutes', () => {
    const result = calculatePay({
      basis: 'hourly',
      hourlyRate: 30,
      shifts: [{ clockInMinutes: 0, clockOutMinutes: null, paidLunch: true }],
      rules: noRoundingRules,
      nowMinutes: 90, // 1.5h in
    });

    expect(result.regularMinutes).toBe(90);
    expect(result.regularPay).toBe(45); // 1.5h * $30
  });
});

describe('calculatePay - monthly', () => {
  it('returns the flat monthly rate plus lunch allowance, ignoring overtime tiers', () => {
    const result = calculatePay({
      basis: 'monthly',
      monthlyRate: 2000,
      lunchAllowancePerShift: 5,
      shifts: [
        { clockInMinutes: 0, clockOutMinutes: 12 * 60, paidLunch: true }, // would be OT if hourly
      ],
      rules: noRoundingRules,
    });

    expect(result.overtimeMinutes).toBe(0);
    expect(result.overtimePay).toBe(0);
    expect(result.regularPay).toBe(2000);
    expect(result.totalPay).toBe(2005);
  });
});

describe('GENERIC_PAY_RULES', () => {
  it('is a usable default rule set', () => {
    const result = calculatePay({
      basis: 'hourly',
      hourlyRate: 10,
      shifts: [{ clockInMinutes: 0, clockOutMinutes: 60, paidLunch: true }],
      rules: GENERIC_PAY_RULES,
    });

    expect(result.totalPay).toBeGreaterThan(0);
  });
});
