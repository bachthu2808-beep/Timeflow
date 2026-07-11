import { estimateLaborCost } from './laborCost';

describe('estimateLaborCost', () => {
  it('sums hourly cost across active and completed shifts', () => {
    const total = estimateLaborCost(
      [
        { hourlyRate: 20, clockInMinutes: 0, clockOutMinutes: 120 }, // 2h * $20 = $40
        { hourlyRate: 15, clockInMinutes: 0, clockOutMinutes: 60 }, // 1h * $15 = $15
      ],
      120
    );

    expect(total).toBe(55);
  });

  it('values an active (still clocked-in) shift up to nowMinutes', () => {
    const total = estimateLaborCost([{ hourlyRate: 30, clockInMinutes: 0, clockOutMinutes: null }], 90);
    expect(total).toBe(45); // 1.5h * $30
  });

  it('ignores shifts without an hourly rate (monthly staff)', () => {
    const total = estimateLaborCost([{ hourlyRate: null, clockInMinutes: 0, clockOutMinutes: 480 }], 480);
    expect(total).toBe(0);
  });
});
