/**
 * A PayRuleSet captures everything about pay calculation that varies by
 * market/jurisdiction, so calculatePay() never hardcodes a country's labor law.
 */

export interface OvertimeTier {
  /** Overtime at this tier applies once total worked minutes exceed this threshold. */
  afterMinutes: number;
  /** Pay multiplier applied to minutes worked within this tier, e.g. 1.5 for time-and-a-half. */
  multiplier: number;
}

export interface PayRuleSet {
  /** Identifier for the rule set, e.g. "vn-default", "us-flsa", "generic". */
  id: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** Overtime tiers, applied in ascending afterMinutes order. Empty array = no overtime. */
  overtimeTiers: OvertimeTier[];
  /** Minutes deducted from worked time when a shift has no paid lunch allowance. */
  unpaidLunchMinutes: number;
  /** Round worked minutes per shift to the nearest N minutes. 0 disables rounding. */
  roundingMinutes: number;
  /** Flat multiplier applied to hourly holiday-shift minutes, bypassing overtime tiers. */
  holidayMultiplier: number;
}

/** Placeholder rule set for markets not yet configured. Replace before launch. */
export const GENERIC_PAY_RULES: PayRuleSet = {
  id: 'generic',
  currency: 'USD',
  overtimeTiers: [{ afterMinutes: 8 * 60, multiplier: 1.5 }],
  unpaidLunchMinutes: 30,
  roundingMinutes: 5,
  holidayMultiplier: 2,
};
