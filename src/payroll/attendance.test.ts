import { computeAttendanceSummary } from './attendance';

describe('computeAttendanceSummary', () => {
  const scheduled = [
    { staffId: 'a', scheduledStartMinutes: 540 }, // 09:00
    { staffId: 'b', scheduledStartMinutes: 540 },
    { staffId: 'c', scheduledStartMinutes: 540 },
    { staffId: 'd', scheduledStartMinutes: 540 },
  ];

  it('classifies present, late, absent, and on-leave staff correctly', () => {
    const actual = [
      { staffId: 'a', clockInMinutes: 538 }, // on time
      { staffId: 'b', clockInMinutes: 560 }, // 20 min late
    ];
    const onLeave = ['c'];
    // 'd' has no clock-in and no leave -> absent

    const summary = computeAttendanceSummary(scheduled, actual, onLeave, 5);

    expect(summary.present).toBe(2); // a and b both clocked in
    expect(summary.late).toBe(1); // only b
    expect(summary.onLeave).toBe(1); // c
    expect(summary.absent).toBe(1); // d
    expect(summary.statusByStaffId).toEqual({
      a: 'present',
      b: 'late',
      c: 'on_leave',
      d: 'absent',
    });
  });

  it('treats a clock-in within the grace window as on time, not late', () => {
    const summary = computeAttendanceSummary(
      [{ staffId: 'a', scheduledStartMinutes: 540 }],
      [{ staffId: 'a', clockInMinutes: 544 }],
      [],
      5
    );
    expect(summary.late).toBe(0);
    expect(summary.present).toBe(1);
  });

  it('uses the earliest clock-in when a staff member has multiple shifts today', () => {
    const summary = computeAttendanceSummary(
      [{ staffId: 'a', scheduledStartMinutes: 540 }],
      [
        { staffId: 'a', clockInMinutes: 600 },
        { staffId: 'a', clockInMinutes: 538 },
      ],
      [],
      5
    );
    expect(summary.statusByStaffId.a).toBe('present');
  });

  it('returns all zeros for an empty schedule', () => {
    const summary = computeAttendanceSummary([], [], [], 5);
    expect(summary).toEqual({ present: 0, absent: 0, late: 0, onLeave: 0, statusByStaffId: {} });
  });
});
