export interface ScheduledStaff {
  staffId: string;
  scheduledStartMinutes: number;
}

export interface ActualClockIn {
  staffId: string;
  clockInMinutes: number;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'on_leave';

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  statusByStaffId: Record<string, AttendanceStatus>;
}

/**
 * Cross-references today's expected roster (from shift_schedule) against
 * actual clock-ins and approved leave to classify each staff member.
 * "Late" is a flag on an already-present staff member, not a separate
 * headcount bucket — present already includes late arrivals.
 */
export function computeAttendanceSummary(
  scheduled: ScheduledStaff[],
  actual: ActualClockIn[],
  staffOnApprovedLeave: string[],
  graceMinutes: number
): AttendanceSummary {
  const earliestClockInByStaff = new Map<string, number>();
  for (const entry of actual) {
    const existing = earliestClockInByStaff.get(entry.staffId);
    if (existing === undefined || entry.clockInMinutes < existing) {
      earliestClockInByStaff.set(entry.staffId, entry.clockInMinutes);
    }
  }

  const onLeaveSet = new Set(staffOnApprovedLeave);
  const statusByStaffId: Record<string, AttendanceStatus> = {};
  let present = 0;
  let late = 0;
  let absent = 0;
  let onLeave = 0;

  for (const staff of scheduled) {
    if (onLeaveSet.has(staff.staffId)) {
      statusByStaffId[staff.staffId] = 'on_leave';
      onLeave += 1;
      continue;
    }

    const clockIn = earliestClockInByStaff.get(staff.staffId);
    if (clockIn !== undefined) {
      present += 1;
      if (clockIn > staff.scheduledStartMinutes + graceMinutes) {
        statusByStaffId[staff.staffId] = 'late';
        late += 1;
      } else {
        statusByStaffId[staff.staffId] = 'present';
      }
      continue;
    }

    statusByStaffId[staff.staffId] = 'absent';
    absent += 1;
  }

  return { present, absent, late, onLeave, statusByStaffId };
}
