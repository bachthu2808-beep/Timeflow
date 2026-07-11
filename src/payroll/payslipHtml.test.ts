import { buildPayslipHtml } from './payslipHtml';

describe('buildPayslipHtml', () => {
  it('includes the staff name, range label, and every pay line', () => {
    const html = buildPayslipHtml({
      staffName: 'Jane Doe',
      rangeLabel: 'week',
      result: {
        regularMinutes: 480,
        overtimeMinutes: 60,
        holidayMinutes: 0,
        regularPay: 160,
        overtimePay: 22.5,
        holidayPay: 0,
        lunchAllowance: 10,
        totalPay: 192.5,
      },
    });

    expect(html).toContain('Jane Doe');
    expect(html).toContain('week');
    expect(html).toContain('160 đ');
    expect(html).toContain('23 đ'); // 22.5 rounds to 23
    expect(html).toContain('10 đ');
    expect(html).toContain('193 đ'); // 192.5 rounds to 193
  });

  it('escapes HTML-significant characters in the staff name', () => {
    const html = buildPayslipHtml({
      staffName: '<script>alert(1)</script>',
      rangeLabel: 'today',
      result: {
        regularMinutes: 0,
        overtimeMinutes: 0,
        holidayMinutes: 0,
        regularPay: 0,
        overtimePay: 0,
        holidayPay: 0,
        lunchAllowance: 0,
        totalPay: 0,
      },
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
