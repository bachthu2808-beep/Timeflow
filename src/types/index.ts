export type UserRole = 'owner' | 'employee';

export type PayBasis = 'hourly' | 'monthly';

export interface Profile {
  id: string;
  ownerId: string; // the owner account this staff member belongs to (self-referential for owners)
  role: UserRole;
  fullName: string;
  payBasis: PayBasis;
  hourlyRate: number | null;
  monthlyRate: number | null;
  lunchAllowancePerShift: number;
  payRuleSetId: string;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
}

export type ShiftStatus = 'active' | 'completed';

export interface ShiftRecord {
  id: string;
  staffId: string;
  shopId: string;
  clockInAt: string; // ISO timestamp
  clockOutAt: string | null;
  paidLunch: boolean;
  status: ShiftStatus;
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
