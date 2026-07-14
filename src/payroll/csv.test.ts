import { buildPayrollCsv } from './csv';

describe('buildPayrollCsv', () => {
  it('builds a header row plus one row per staff member', () => {
    const csv = buildPayrollCsv([
      { name: 'Alice', regularPay: 100, overtimePay: 10, holidayPay: 0, lunchAllowance: 5, totalPay: 115 },
      { name: 'Bob', regularPay: 200, overtimePay: 0, holidayPay: 40, lunchAllowance: 5, totalPay: 245 },
    ]);

    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Name,Regular Pay,Overtime Pay,Holiday Pay,Lunch Allowance,Total Pay');
    expect(lines[1]).toBe('Alice,100,10,0,5,115');
    expect(lines[2]).toBe('Bob,200,0,40,5,245');
  });

  it('rounds fractional amounts to whole VND rather than showing decimals', () => {
    const csv = buildPayrollCsv([
      { name: 'Alice', regularPay: 100.6, overtimePay: 0, holidayPay: 0, lunchAllowance: 0, totalPay: 100.6 },
    ]);

    expect(csv.trim().split('\n')[1]).toBe('Alice,101,0,0,0,101');
  });

  it('quotes names containing a comma', () => {
    const csv = buildPayrollCsv([
      { name: 'Doe, Jane', regularPay: 50, overtimePay: 0, holidayPay: 0, lunchAllowance: 0, totalPay: 50 },
    ]);

    expect(csv).toContain('"Doe, Jane"');
  });

  it('returns just the header for an empty roster', () => {
    const csv = buildPayrollCsv([]);
    expect(csv.trim().split('\n')).toHaveLength(1);
  });
});
