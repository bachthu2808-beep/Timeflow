import type { PayResult } from './calculatePay';

export interface PayslipHtmlInput {
  staffName: string;
  rangeLabel: string;
  result: PayResult;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value: number): string {
  return value.toFixed(2);
}

export function buildPayslipHtml({ staffName, rangeLabel, result }: PayslipHtmlInput): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 32px;">
    <h1 style="margin-bottom: 0;">TimeFlow Payslip</h1>
    <p style="color: #666; margin-top: 4px;">${escapeHtml(staffName)} — ${escapeHtml(rangeLabel)}</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
      <tr><td style="padding: 8px 0;">Regular pay</td><td style="text-align: right;">$${money(result.regularPay)}</td></tr>
      <tr><td style="padding: 8px 0;">Overtime pay</td><td style="text-align: right;">$${money(result.overtimePay)}</td></tr>
      <tr><td style="padding: 8px 0;">Holiday pay</td><td style="text-align: right;">$${money(result.holidayPay)}</td></tr>
      <tr><td style="padding: 8px 0;">Lunch allowance</td><td style="text-align: right;">$${money(result.lunchAllowance)}</td></tr>
      <tr style="border-top: 2px solid #111; font-weight: bold;">
        <td style="padding: 8px 0;">Total</td><td style="text-align: right;">$${money(result.totalPay)}</td>
      </tr>
    </table>
  </body>
</html>`;
}
