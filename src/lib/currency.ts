/** Formats a number as Vietnamese Dong: dot thousand separators, no decimals, "đ" suffix. */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  const negative = rounded < 0;
  const digits = Math.abs(rounded).toString();
  const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${withSeparators} đ`;
}

/**
 * Parses a pay-rate/currency text input, treating "." as the thousands
 * separator this app displays money with (see formatCurrency) rather than a
 * decimal point — VND has no subunits, so an owner typing "50.000" (matching
 * every other amount shown in this app) always means 50,000, never 50.
 * Plain `parseFloat` would silently read "50.000" as 50, understating pay by
 * 1000x. Returns null if the input isn't a whole number after stripping
 * separators (e.g. empty, or contains letters).
 */
export function parseCurrencyInput(input: string): number | null {
  const digitsOnly = input.trim().replace(/[.,]/g, '');
  if (digitsOnly === '' || !/^\d+$/.test(digitsOnly)) return null;
  return parseInt(digitsOnly, 10);
}
