export interface PayrollCsvRow {
  name: string;
  regularPay: number;
  overtimePay: number;
  holidayPay: number;
  lunchAllowance: number;
  totalPay: number;
}

function csvField(value: string): string {
  return value.includes(',') || value.includes('"')
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

const HEADER = 'Name,Regular Pay,Overtime Pay,Holiday Pay,Lunch Allowance,Total Pay';

// VND has no subunits — every other amount in this app is a whole number
// (see formatCurrency), so exporting ".00" here would be the one place that
// implies fractional currency exists.
function csvAmount(value: number): string {
  return Math.round(value).toString();
}

export function buildPayrollCsv(rows: PayrollCsvRow[]): string {
  const lines = [HEADER];

  for (const row of rows) {
    lines.push(
      [
        csvField(row.name),
        csvAmount(row.regularPay),
        csvAmount(row.overtimePay),
        csvAmount(row.holidayPay),
        csvAmount(row.lunchAllowance),
        csvAmount(row.totalPay),
      ].join(',')
    );
  }

  return lines.join('\n') + '\n';
}
