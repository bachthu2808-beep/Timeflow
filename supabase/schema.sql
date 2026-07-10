-- TimeFlow schema.
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- One row per authenticated user (owner or employee). `owner_id` points at the
-- owning owner's profile id for employees, and at itself for owners.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  owner_id uuid not null references profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'employee')),
  full_name text not null,
  pay_basis text not null check (pay_basis in ('hourly', 'monthly')),
  hourly_rate numeric,
  monthly_rate numeric,
  lunch_allowance_per_shift numeric not null default 0,
  pay_rule_set_id text not null default 'generic',
  created_at timestamptz not null default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  geofence_radius_meters integer not null default 100,
  created_at timestamptz not null default now()
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles (id) on delete cascade,
  shop_id uuid not null references shops (id) on delete cascade,
  clock_in_at timestamptz not null default now(),
  clock_out_at timestamptz,
  paid_lunch boolean not null default false,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now()
);

create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles (id) on delete cascade,
  owner_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('time_off', 'schedule_change')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  requested_start timestamptz not null,
  requested_end timestamptz not null,
  note text,
  created_at timestamptz not null default now()
);

create table pay_periods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'open' check (status in ('open', 'processing', 'paid')),
  created_at timestamptz not null default now()
);

-- Row Level Security: owners see/manage their own shop's data, employees see
-- only their own records (plus the shop they're assigned to, for geofencing).

alter table profiles enable row level security;
alter table shops enable row level security;
alter table shifts enable row level security;
alter table approval_requests enable row level security;
alter table pay_periods enable row level security;

create policy "profiles: self or owner reads staff" on profiles
  for select using (id = auth.uid() or owner_id = auth.uid());

create policy "profiles: owner manages staff" on profiles
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "shops: owner manages own shops" on shops
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "shops: staff read assigned owner's shops" on shops
  for select using (
    owner_id in (select owner_id from profiles where id = auth.uid())
  );

create policy "shifts: staff manage own shifts" on shifts
  for all using (staff_id = auth.uid()) with check (staff_id = auth.uid());

create policy "shifts: owner reads staff shifts" on shifts
  for select using (
    staff_id in (select id from profiles where owner_id = auth.uid())
  );

create policy "approval_requests: staff manage own requests" on approval_requests
  for all using (staff_id = auth.uid()) with check (staff_id = auth.uid());

create policy "approval_requests: owner reads and responds" on approval_requests
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "pay_periods: owner manages own periods" on pay_periods
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Realtime: enable change notifications on the tables the apps subscribe to.
alter publication supabase_realtime add table shifts;
alter publication supabase_realtime add table approval_requests;
