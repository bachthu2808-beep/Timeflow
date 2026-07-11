import { formatCurrency } from './currency';

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
