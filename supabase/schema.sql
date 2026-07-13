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
  job_title text,
  pay_basis text not null check (pay_basis in ('hourly', 'monthly')),
  hourly_rate numeric,
  monthly_rate numeric,
  lunch_allowance_per_shift numeric not null default 0,
  pay_rule_set_id text not null default 'generic',
  default_shop_id uuid,
  expo_push_token text,
  created_at timestamptz not null default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  geofence_radius_meters integer not null default 100,
  daily_labor_budget numeric,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_default_shop_id_fkey
  foreign key (default_shop_id) references shops (id) on delete set null;

create table shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles (id) on delete cascade,
  shop_id uuid not null references shops (id) on delete cascade,
  clock_in_at timestamptz not null default now(),
  clock_out_at timestamptz,
  paid_lunch boolean not null default false,
  is_holiday boolean not null default false,
  status text not null default 'active' check (status in ('active', 'completed')),
  mocked_location boolean not null default false,
  clock_in_photo_url text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger shifts_set_updated_at
  before update on shifts
  for each row execute function set_updated_at();

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

-- Scheduling: shifts an owner plans in advance, distinct from `shifts` (which
-- records actual clock in/out punches).
create table shift_schedule (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  shop_id uuid not null references shops (id) on delete cascade,
  staff_id uuid not null references profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Shift swap marketplace: an employee offers a scheduled shift, either to a
-- specific coworker or open to anyone, and the owner gives final approval.
create table swap_requests (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references shift_schedule (id) on delete cascade,
  owner_id uuid not null references profiles (id) on delete cascade,
  requesting_staff_id uuid not null references profiles (id) on delete cascade,
  target_staff_id uuid references profiles (id) on delete cascade, -- null = open to anyone
  accepted_by_staff_id uuid references profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'accepted', 'owner_approved', 'denied', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Chat: one thread per owner/employee pair.
create table messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  staff_id uuid not null references profiles (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Audit log: append-only, populated by DB triggers so it can't be skipped by
-- an app-level bug. Used to resolve wage disputes ("who approved what, when").
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create or replace function log_shift_audit()
returns trigger as $$
begin
  insert into audit_log (owner_id, actor_id, action, entity_type, entity_id, detail)
  select
    p.owner_id,
    auth.uid(),
    case when TG_OP = 'INSERT' then 'shift_clock_in' else 'shift_updated' end,
    'shift',
    new.id,
    jsonb_build_object(
      'clock_in_at', new.clock_in_at,
      'clock_out_at', new.clock_out_at,
      'status', new.status,
      'mocked_location', new.mocked_location
    )
  from profiles p where p.id = new.staff_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger shifts_audit
  after insert or update on shifts
  for each row execute function log_shift_audit();

create or replace function log_approval_audit()
returns trigger as $$
begin
  insert into audit_log (owner_id, actor_id, action, entity_type, entity_id, detail)
  values (
    new.owner_id,
    auth.uid(),
    case when TG_OP = 'INSERT' then 'approval_requested' else 'approval_' || new.status end,
    'approval_request',
    new.id,
    jsonb_build_object('kind', new.kind, 'status', new.status)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger approval_requests_audit
  after insert or update on approval_requests
  for each row execute function log_approval_audit();

-- Staff invitations: owner enters an employee's email + pay terms before the
-- employee has an account. When that email signs up, the app looks up and
-- consumes the matching invitation to create the employee's profile row.
create table staff_invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  email text not null,
  full_name text not null,
  job_title text,
  pay_basis text not null check (pay_basis in ('hourly', 'monthly')),
  hourly_rate numeric,
  monthly_rate numeric,
  lunch_allowance_per_shift numeric not null default 0,
  default_shop_id uuid references shops (id) on delete set null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table staff_invitations enable row level security;

create policy "staff_invitations: owner manages own invitations" on staff_invitations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "staff_invitations: invitee reads their own pending invitation" on staff_invitations
  for select using (email = (auth.jwt() ->> 'email') and consumed_at is null);

-- Signup is DB-enforced via a security-definer trigger on auth.users rather
-- than a broad "insert your own profile" RLS policy, so a client can't
-- fabricate owner_id. The trigger (not an RPC called after signUp) is what
-- makes this work when "Confirm email" is on: signUp() returns no session
-- until the address is confirmed, so a client-side RPC call right after
-- signUp runs unauthenticated and auth.uid() is null. The trigger fires
-- inside Postgres the moment the auth.users row is inserted, independent of
-- whether the client ever gets a session.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
  v_full_name text := new.raw_user_meta_data ->> 'full_name';
  inv staff_invitations%rowtype;
begin
  if v_role = 'owner' then
    insert into profiles (id, owner_id, role, full_name, pay_basis)
    values (new.id, new.id, 'owner', coalesce(v_full_name, ''), 'monthly');
  elsif v_role = 'employee' then
    select * into inv from staff_invitations
      where lower(email) = lower(new.email) and consumed_at is null
      order by created_at desc
      limit 1;

    if found then
      insert into profiles (
        id, owner_id, role, full_name, job_title, pay_basis, hourly_rate, monthly_rate,
        lunch_allowance_per_shift, default_shop_id
      )
      values (
        new.id, inv.owner_id, 'employee', inv.full_name, inv.job_title, inv.pay_basis, inv.hourly_rate,
        inv.monthly_rate, inv.lunch_allowance_per_shift, inv.default_shop_id
      );

      update staff_invitations set consumed_at = now() where id = inv.id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up screen tell an uninvited employee "no invitation found"
-- before creating an auth account for them, without requiring a session
-- (staff_invitations RLS otherwise requires auth.jwt() to already carry the
-- invitee's email).
create or replace function public.has_pending_invitation(p_email text)
returns boolean as $$
  select exists (
    select 1 from staff_invitations
    where lower(email) = lower(p_email) and consumed_at is null
  );
$$ language sql security definer set search_path = public stable;

grant execute on function public.has_pending_invitation(text) to anon, authenticated;

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

alter table shift_schedule enable row level security;
alter table swap_requests enable row level security;
alter table messages enable row level security;
alter table audit_log enable row level security;

create policy "shift_schedule: owner manages own schedule" on shift_schedule
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "shift_schedule: staff read their own scheduled shifts" on shift_schedule
  for select using (staff_id = auth.uid());

create policy "swap_requests: owner manages own" on swap_requests
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "swap_requests: requester manages own request" on swap_requests
  for all using (requesting_staff_id = auth.uid()) with check (requesting_staff_id = auth.uid());

create policy "swap_requests: staff read open or targeted requests" on swap_requests
  for select using (
    target_staff_id = auth.uid()
    or (target_staff_id is null and owner_id in (select owner_id from profiles where id = auth.uid()))
  );

create policy "swap_requests: staff accept an open or targeted request" on swap_requests
  for update using (
    status = 'open'
    and (target_staff_id = auth.uid() or target_staff_id is null)
    and owner_id in (select owner_id from profiles where id = auth.uid())
  );

create policy "messages: participants read and send" on messages
  for all using (owner_id = auth.uid() or staff_id = auth.uid())
  with check (sender_id = auth.uid() and (owner_id = auth.uid() or staff_id = auth.uid()));

create policy "audit_log: owner reads own log" on audit_log
  for select using (owner_id = auth.uid());

-- Storage: clock-in photos (staff-uploaded, owner-reviewable for dispute resolution).
insert into storage.buckets (id, name, public) values ('clock-in-photos', 'clock-in-photos', false)
  on conflict (id) do nothing;

create policy "clock-in-photos: staff upload their own" on storage.objects
  for insert with check (bucket_id = 'clock-in-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "clock-in-photos: staff and their owner can view" on storage.objects
  for select using (
    bucket_id = 'clock-in-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (select id::text from profiles where owner_id = auth.uid())
    )
  );

-- Realtime: enable change notifications on the tables the apps subscribe to.
alter publication supabase_realtime add table shifts;
alter publication supabase_realtime add table approval_requests;
alter publication supabase_realtime add table shift_schedule;
alter publication supabase_realtime add table swap_requests;
alter publication supabase_realtime add table messages;
