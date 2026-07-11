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

export function buildPayrollCsv(rows: PayrollCsvRow[]): string {
  const lines = [HEADER];

  for (const row of rows) {
    lines.push(
      [
        csvField(row.name),
        row.regularPay.toFixed(2),
        row.overtimePay.toFixed(2),
        row.holidayPay.toFixed(2),
        row.lunchAllowance.toFixed(2),
        row.totalPay.toFixed(2),
      ].join(',')
    );
  }

  return lines.join('\n') + '\n';
}
