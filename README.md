# TimeFlow (app name: bt28staff)

Real-time HR & payroll for small shops/cafes. One app, two roles — owners get a
live overview of who's clocked in, staff roster, approvals, payroll runs,
rota building, and an audit log; employees get geofenced clock-in/out, a live
earnings ticker, payslips, scheduling, shift swaps, and in-app chat.

## Stack

- **App**: React Native (Expo, TypeScript) — single codebase, UI branches on
  the logged-in user's role instead of shipping two separate apps.
- **Backend**: [Supabase](https://supabase.com) (Postgres + Realtime + Row
  Level Security). Owner/employee data isolation is enforced at the database
  layer via RLS, not hand-rolled checks in app code — see `supabase/schema.sql`.
- **Sync**: Supabase Realtime channels (`postgres_changes`). An owner
  approving a request, a swap being offered, or an employee clocking in is
  pushed to the other device live, no polling.
- **Location**: `expo-location`, foreground-only (checked at the moment of
  Clock In / Clock Out, not tracked continuously in the background). This
  keeps App Store / Play Store review simpler than background-geofencing
  apps — deliberately deferred, see "Known limitations" below.

## Project layout

```
src/
  payroll/          Pluggable pay-rule engine and every pure, unit-tested
                     calculation: calculatePay, payRules, streaks (attendance
                     gamification), laborCost (dashboard alert), csv (payroll
                     export), payslipHtml (PDF export).
  lib/               Supabase client, geofence distance math, offline
                     clock-in/out queue, push notification registration.
  types/             Shared TypeScript types mirroring the DB schema.
  context/           AuthContext — session + profile (role) from Supabase Auth.
  navigation/        RootNavigator picks OwnerTabs or EmployeeTabs by role.
  screens/
    auth/            Login.
    owner/            Dashboard (live "who's clocked in" + labor-cost alert),
                       Schedule (rota builder), Roster, Approvals (time-off +
                       swap sign-off), Payroll runs (CSV export), Chat,
                       Audit log.
    employee/          Clock in/out (offline-queued, photo capture, spoofed-
                       GPS flagging), Schedule (view + offer/accept swaps),
                       Payslip (PDF export), History, Chat.
    shared/            ChatThreadScreen, used by both roles.
supabase/
  schema.sql         Tables, RLS policies, audit-log triggers, storage bucket
                     policy for clock-in photos, Realtime publication setup.
```

## Setup

1. Create a Supabase project, then run `supabase/schema.sql` in its SQL
   editor.
2. `cp .env.example .env` and fill in your project's URL + anon key.
3. `npm install`
4. `npm start` — scan the QR with Expo Go, or run `npm run ios` / `npm run
   android` with a dev client.
5. In the app: **Sign up as the owner** first (Login screen → "New here?
   Create an account" → "I'm the owner"). Then go to the **Shop** tab and
   save your shop (name, geofence radius, "Use my current location").
6. Invite staff from **Roster → Invite staff** (email + pay terms). The
   employee then signs up in the app with that same email, choosing "I'm
   joining a shop" — their profile is created automatically from the
   invitation, no manual code-sharing needed.

## Getting it to a few testers (before an app store submission)

Two options, neither requires an Apple/Google developer account yet:

**Option A — Expo Go + tunnel (fastest, zero cost)**
```
npm run start:tunnel
```
This prints a QR code and a link that work from anywhere (not just your
wifi). Send the link to your testers — they install the free **Expo Go**
app, open the link, and the app loads inside it. Best for quick iteration;
every tester needs Expo Go installed, and Android push notifications don't
fully work inside Expo Go (a Google Play restriction on shell apps, not a
bug in this codebase).

**Option B — EAS internal build (a real installable app icon)**
```
npm install -g eas-cli
eas login          # free Expo account
eas build --profile preview --platform android   # installable APK, share the link
eas build --profile preview --platform ios       # needs a free Apple ID for ad-hoc signing
```
`eas.json` is already configured with a `preview` profile (internal
distribution). The Android build produces a direct-install APK link — no
Play Store needed. The iOS build needs your Apple ID registered as an ad-hoc
tester device via EAS's device-registration flow (still no paid Developer
Program required for a handful of test devices, though Apple does cap how
many can be registered this way).

Change `com.timeflow.app` in `app.json` (`ios.bundleIdentifier` /
`android.package`) to your own identifier before building if you plan to
eventually publish under your own name.

## Design system & localization

The UI follows a reference design: forest-green brand color, pale-mint
background, dark "hero" cards for the labor-cost banner, pastel avatar
chips, and tabular/monospace figures for money and time. Tokens live in
`src/theme/`; shared components (`Avatar`, `StatCard`, `SectionLabel`,
`WeeklyBarChart`) live in `src/components/`.

The app is fully localized in **English and Vietnamese** (`src/i18n/`),
with a language toggle in every screen header and automatic device-language
detection on first launch. Currency is formatted as Vietnamese Dong
(`formatCurrency` in `src/lib/currency.ts`) — dot thousand separators, no
decimals, "đ" suffix — matching the reference design.

## Testing

```
npx jest
```

Every pure calculation in `src/payroll/` and `src/lib/geofence.ts` +
`src/lib/offlineQueue.ts` has full unit test coverage (54 tests) — run these
before changing pay logic, since a payroll bug is a trust-breaking bug.

## Feature status

**Built and tested this round:**
- Full visual redesign to match the reference mockups (color system,
  typography, avatars, cards) — see "Design system" above
- English + Vietnamese localization with a persisted language switcher
- Present / Absent / Late / On-leave attendance dashboard, cross-referencing
  the rota against actual clock-ins and approved leave
- Weekly labor-cost trend chart (Mon–Sun)
- Job titles per staff member, staff search, tap-to-edit-pay
- Store open/closed toggle
- Owner and employee sign-up (email invitation flow, DB-enforced via
  security-definer Postgres functions so a client can't fabricate
  `owner_id`)
- Shop setup screen (name, geofence radius, daily labor budget, "use my
  current location")
- Invite-staff form on the Roster screen
- Holiday pay + split-shift overtime pooling in `calculatePay`
- Attendance streaks (on-time gamification badge)
- Owner labor-cost alert banner (vs. a per-shop daily budget)
- Offline clock-in/out queue (AsyncStorage-backed, syncs on reconnect)
- Payroll CSV export, payslip PDF export
- Audit log (Postgres-trigger based — can't be bypassed by an app bug)
- Rota builder (owner) + shift swap marketplace (offer → accept → owner
  approval)
- Multi-location groundwork (`shops.daily_labor_budget`,
  `profiles.default_shop_id`)
- In-app chat (owner ↔ each employee)
- Clock-in photo capture (owner-reviewable, stored in Supabase Storage)
- Best-effort spoofed-GPS flagging (Android `mocked` signal, surfaced to the
  owner rather than hard-blocking clock-in)
- Push notification token registration

**Known limitations — deliberately not built:**
- **True face-match verification.** Photo capture at clock-in is real; an
  automated identity check against it is not — that needs a paid biometric
  API (AWS Rekognition, Face++, etc.). Current MVP is capture + owner
  review.
- **Push notification delivery.** Token registration is wired up, but
  actually *sending* a push (late clock-in, new approval, etc.) requires a
  server-side sender — a Supabase Edge Function calling the Expo push API —
  which needs to be deployed against your own Supabase project.
- **WiFi/Bluetooth geofence fallback.** GPS-only. Indoor accuracy fallback
  needs native modules outside Expo Go's managed workflow (a custom dev
  client build).
- **iOS spoofed-location detection.** The `mocked` flag is Android-only.
- A configured `PayRuleSet` per owner — every screen still falls back to
  `GENERIC_PAY_RULES`. Swap in a real rule set once the launch market/country
  is decided; the engine already supports multi-tier overtime, rounding,
  holiday pay, and paid-vs-unpaid lunch without further code changes.
- Multi-shop switcher UI — an owner with more than one shop can only manage
  the first one created; the data model supports more, the UI doesn't yet.
