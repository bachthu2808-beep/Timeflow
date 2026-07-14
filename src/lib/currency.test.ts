import { formatCurrency, parseCurrencyInput } from './currency';

describe('formatCurrency', () => {
  it('formats with dot thousand separators and a đ suffix', () => {
    expect(formatCurrency(1320000)).toBe('1.320.000 đ');
  });

  it('rounds to the nearest whole đ', () => {
    expect(formatCurrency(25000.6)).toBe('25.001 đ');
  });

  it('formats small amounts without separators', () => {
    expect(formatCurrency(500)).toBe('500 đ');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0 đ');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-1500)).toBe('-1.500 đ');
  });
});

describe('parseCurrencyInput', () => {
  it('treats dots as thousand separators, not decimal points', () => {
    expect(parseCurrencyInput('50.000')).toBe(50000);
  });

  it('parses a plain digit string with no separators', () => {
    expect(parseCurrencyInput('50000')).toBe(50000);
  });

  it('strips commas too', () => {
    expect(parseCurrencyInput('50,000')).toBe(50000);
  });

  it('returns 0 for a literal zero', () => {
    expect(parseCurrencyInput('0')).toBe(0);
  });

  it('returns null for empty input', () => {
    expect(parseCurrencyInput('')).toBeNull();
    expect(parseCurrencyInput('   ')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseCurrencyInput('abc')).toBeNull();
    expect(parseCurrencyInput('50k')).toBeNull();
  });
});
