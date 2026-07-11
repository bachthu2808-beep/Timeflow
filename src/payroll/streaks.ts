export interface StreakShift {
  clockInAt: string; // ISO timestamp
}

export interface StreakOptions {
  /** The hour (0-23, in whatever timezone the timestamps are in) the shift is scheduled to start. */
  scheduledHour: number;
  /** Minutes of leeway after scheduledHour that still counts as "on time". */
  graceMinutes: number;
}

const DEFAULT_OPTIONS: StreakOptions = { scheduledHour: 9, graceMinutes: 5 };

function startOfDay(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function minutesLate(iso: string, options: StreakOptions): number {
  const d = new Date(iso);
  const scheduled = new Date(d);
  scheduled.setHours(options.scheduledHour, 0, 0, 0);
  return (d.getTime() - scheduled.getTime()) / 60000;
}

/**
 * Counts the current consecutive-day on-time streak, walking backward from
 * `asOf`. A day breaks the streak if the clock-in was late (beyond grace) or
 * if a calendar day was skipped entirely.
 */
export function calculateOnTimeStreak(
  shifts: StreakShift[],
  asOf: string,
  options: StreakOptions = DEFAULT_OPTIONS
): number {
  if (shifts.length === 0) {
    return 0;
  }

  const sorted = [...shifts].sort(
    (a, b) => new Date(b.clockInAt).getTime() - new Date(a.clockInAt).getTime()
  );

  let streak = 0;
  let expectedDay = startOfDay(asOf);
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const shift of sorted) {
    const shiftDay = startOfDay(shift.clockInAt);

    if (shiftDay !== expectedDay) {
      break; // missed a day
    }
    if (minutesLate(shift.clockInAt, options) > options.graceMinutes) {
      break; // late, streak ends here
    }

    streak += 1;
    expectedDay -= oneDayMs;
  }

  return streak;
}
