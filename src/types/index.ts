export type UserRole = 'owner' | 'employee';

export type PayBasis = 'hourly' | 'monthly';

export interface Profile {
  id: string;
  ownerId: string; // the owner account this staff member belongs to (self-referential for owners)
  role: UserRole;
  fullName: string;
  jobTitle: string | null;
  payBasis: PayBasis;
  hourlyRate: number | null;
  monthlyRate: number | null;
  lunchAllowancePerShift: number;
  payRuleSetId: string;
  defaultShopId: string | null;
  expoPushToken: string | null;
  deactivatedAt: string | null;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  dailyLaborBudget: number | null;
  isOpen: boolean;
}

export type ShiftStatus = 'active' | 'completed';

export interface ShiftRecord {
  id: string;
  staffId: string;
  shopId: string;
  clockInAt: string; // ISO timestamp
  clockOutAt: string | null;
  paidLunch: boolean;
  isHoliday: boolean;
  status: ShiftStatus;
  mockedLocation: boolean;
  clockInPhotoUrl: string | null;
}

export type ApprovalKind = 'time_off' | 'schedule_change';
export type ApprovalStatus = 'pending' | 'approved' | 'denied';

export interface ApprovalRequest {
  id: string;
  staffId: string;
  ownerId: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  requestedStart: string;
  requestedEnd: string;
  note: string | null;
  createdAt: string;
}

export interface PayPeriod {
  id: string;
  ownerId: string;
  periodStart: string;
  periodEnd: string;
  status: 'open' | 'processing' | 'paid';
}

export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled';

export interface ScheduledShift {
  id: string;
  ownerId: string;
  shopId: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  status: ScheduleStatus;
}

export type SwapStatus = 'open' | 'accepted' | 'owner_approved' | 'denied' | 'cancelled';

export interface SwapRequest {
  id: string;
  scheduleId: string;
  ownerId: string;
  requestingStaffId: string;
  targetStaffId: string | null;
  acceptedByStaffId: string | null;
  status: SwapStatus;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  ownerId: string;
  staffId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface StaffInvitation {
  id: string;
  ownerId: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  payBasis: PayBasis;
  hourlyRate: number | null;
  monthlyRate: number | null;
  lunchAllowancePerShift: number;
  defaultShopId: string | null;
  consumedAt: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  ownerId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
}
