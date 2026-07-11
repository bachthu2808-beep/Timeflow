/** Formats a number as Vietnamese Dong: dot thousand separators, no decimals, "đ" suffix. */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  const negative = rounded < 0;
  const digits = Math.abs(rounded).toString();
  const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${withSeparators} đ`;
}
