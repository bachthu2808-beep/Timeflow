import { formatCurrency } from '../lib/currency';
import type { PayResult } from './calculatePay';

export interface PayslipLabels {
  title: string;
  regularPay: string;
  overtimePay: string;
  holidayPay: string;
  lunchAllowance: string;
  total: string;
}

const DEFAULT_LABELS: PayslipLabels = {
  title: 'Payslip',
  regularPay: 'Regular pay',
  overtimePay: 'Overtime pay',
  holidayPay: 'Holiday pay',
  lunchAllowance: 'Lunch allowance',
  total: 'Total',
};

export interface PayslipHtmlInput {
  staffName: string;
  rangeLabel: string;
  result: PayResult;
  labels?: PayslipLabels;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPayslipHtml({ staffName, rangeLabel, result, labels = DEFAULT_LABELS }: PayslipHtmlInput): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 32px;">
    <h1 style="margin-bottom: 0;">${escapeHtml(labels.title)}</h1>
    <p style="color: #666; margin-top: 4px;">${escapeHtml(staffName)} — ${escapeHtml(rangeLabel)}</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
      <tr><td style="padding: 8px 0;">${escapeHtml(labels.regularPay)}</td><td style="text-align: right;">${formatCurrency(result.regularPay)}</td></tr>
      <tr><td style="padding: 8px 0;">${escapeHtml(labels.overtimePay)}</td><td style="text-align: right;">${formatCurrency(result.overtimePay)}</td></tr>
      <tr><td style="padding: 8px 0;">${escapeHtml(labels.holidayPay)}</td><td style="text-align: right;">${formatCurrency(result.holidayPay)}</td></tr>
      <tr><td style="padding: 8px 0;">${escapeHtml(labels.lunchAllowance)}</td><td style="text-align: right;">${formatCurrency(result.lunchAllowance)}</td></tr>
      <tr style="border-top: 2px solid #111; font-weight: bold;">
        <td style="padding: 8px 0;">${escapeHtml(labels.total)}</td><td style="text-align: right;">${formatCurrency(result.totalPay)}</td>
      </tr>
    </table>
  </body>
</html>`;
}
