import { computeLateArrivals } from './lateArrivals';

describe('computeLateArrivals', () => {
  it('flags a staff member who clocked in past the grace window', () => {
    // Arrange
    const entries = [
      {
        staffId: 'a',
        staffName: 'An',
        jobTitle: 'Barista',
        clockInMinutes: 547, // scheduled 09:00 (540), 7 min late
        scheduledStartMinutes: 540,
        hourlyRate: 120000,
      },
    ];

    // Act
    const result = computeLateArrivals(entries, 5);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].lateMinutes).toBe(7);
    expect(result[0].costImpact).toBeCloseTo(14000);
  });

  it('excludes a clock-in inside the grace window', () => {
    const entries = [
      { staffId: 'a', staffName: 'An', jobTitle: null, clockInMinutes: 544, scheduledStartMinutes: 540, hourlyRate: 100000 },
    ];

    const result = computeLateArrivals(entries, 5);

    expect(result).toHaveLength(0);
  });

  it('returns null cost impact when the staff member has no hourly rate', () => {
    const entries = [
      { staffId: 'a', staffName: 'An', jobTitle: null, clockInMinutes: 560, scheduledStartMinutes: 540, hourlyRate: null },
    ];

    const result = computeLateArrivals(entries, 5);

    expect(result[0].costImpact).toBeNull();
  });

  it('sorts the latest arrivals first', () => {
    const entries = [
      { staffId: 'a', staffName: 'An', jobTitle: null, clockInMinutes: 547, scheduledStartMinutes: 540, hourlyRate: null }, // 7m late
      { staffId: 'b', staffName: 'Huy', jobTitle: null, clockInMinutes: 572, scheduledStartMinutes: 540, hourlyRate: null }, // 32m late
      { staffId: 'c', staffName: 'Ha', jobTitle: null, clockInMinutes: 556, scheduledStartMinutes: 540, hourlyRate: null }, // 16m late
    ];

    const result = computeLateArrivals(entries, 5);

    expect(result.map((r) => r.staffId)).toEqual(['b', 'c', 'a']);
  });
});
