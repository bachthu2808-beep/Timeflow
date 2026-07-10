# TimeFlow

Real-time HR & payroll for small shops/cafes. One app, two roles — owners get a
live overview of who's clocked in, staff roster, approvals, and payroll runs;
employees get geofenced clock-in/out, a live earnings ticker, and payslips.

## Stack

- **App**: React Native (Expo, TypeScript) — single codebase, UI branches on
  the logged-in user's role instead of shipping two separate apps.
- **Backend**: [Supabase](https://supabase.com) (Postgres + Realtime + Row
  Level Security). Owner/employee data isolation is enforced at the database
  layer via RLS, not hand-rolled checks in app code — see `supabase/schema.sql`.
- **Sync**: Supabase Realtime channels (`postgres_changes`). An owner
  approving a request or an employee clocking in is pushed to the other
  device live, no polling.
- **Location**: `expo-location`, foreground-only (checked at the moment of
  Clock In / Clock Out, not tracked continuously in the background). This
  keeps App Store / Play Store review simple — background location access
  triggers extra scrutiny and a separate policy form on both stores. If you
  later need automatic geofence-triggered clock-in (no tap required), that
  needs `react-native-background-geolocation` and the heavier store
  justification — deliberately deferred.

## Project layout

```
src/
  payroll/         Pluggable pay-rule engine (calculatePay, payRules) — pure
                    functions, fully unit tested, no market hardcoded.
  lib/              Supabase client, geofence distance math.
  types/            Shared TypeScript types mirroring the DB schema.
  context/          AuthContext — session + profile (role) from Supabase Auth.
  navigation/       RootNavigator picks OwnerTabs or EmployeeTabs by role.
  screens/
    auth/           Login.
    owner/           Dashboard (live "who's clocked in"), Roster, Approvals,
                     Payroll runs.
    employee/        Clock in/out with live earnings, Payslip, History.
supabase/
  schema.sql        Tables + RLS policies + Realtime publication setup.
```

## Setup

1. Create a Supabase project, then run `supabase/schema.sql` in its SQL
   editor.
2. `cp .env.example .env` and fill in your project's URL + anon key.
3. `npm install`
4. `npm start` — scan the QR with Expo Go, or run `npm run ios` / `npm run
   android` with a dev client (needed once native modules like
   `expo-location` require a custom build; plain Expo Go works for early UI
   iteration).

## Testing

```
npx jest
```

The payroll engine (`src/payroll/calculatePay.ts`) and geofence math
(`src/lib/geofence.ts`) are pure functions with full unit test coverage —
run these before changing pay logic, since a payroll bug is a trust-breaking
bug.

## What's scaffolded vs. what's next

Done: auth flow, role-based navigation, live owner dashboard (Realtime
subscription), approvals with respond actions, employee clock in/out with
geofence check and live earnings ticker, payslip breakdown by range, shift
history, RLS-secured schema.

Not yet built (marked with `TODO` in the relevant screen):
- Add-staff form on the Roster screen (invite by email, set pay basis/rate).
- "Run payroll" action that aggregates `calculatePay()` across all staff for
  a period and writes a `pay_periods` row.
- Loading the owner's actual shop location into `ClockScreen` instead of the
  placeholder coordinates.
- A configured `PayRuleSet` per owner (currently every screen falls back to
  `GENERIC_PAY_RULES` — replace once the target market/country is decided;
  the engine itself already supports multi-tier overtime, rounding, and
  paid-vs-unpaid lunch per rule set without code changes).
- Push notifications (FCM/APNs) for late clock-ins, missed clock-outs, and
  new approval requests.
