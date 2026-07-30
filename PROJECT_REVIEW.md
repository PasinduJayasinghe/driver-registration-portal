# Fenix Cars — Employee Registration & Workforce Portal

A Next.js 16 (App Router) internal portal for Fenix Cars covering employee onboarding,
time tracking, payroll records, and monthly reporting. Data lives in Postgres (Supabase)
accessed through Prisma 7; authentication is Supabase Auth.

---

## 1. What the project does

### 1.1 Public registration
`/` renders [DriverRegistrationForm.jsx](src/components/DriverRegistrationForm.jsx). Anyone with the link
submits full name, contact number, and job role (`driver`, `sri_lankan_staff`, `manager`).
The [registerDriver](src/app/actions/drivers.js#L19) server action validates the fields, allocates a
sequential `FEN-00001`-style employee ID, and stores the record with status `PENDING`.

### 1.2 Admin portal (`/admin`)
Protected by [proxy.js](src/lib/supabase/proxy.js) plus the [(authed) layout](src/app/admin/%28authed%29/layout.js).

| Route | Purpose |
| --- | --- |
| `/admin` | Dashboard: counts by status, 5 most recent registrations, feature shortcuts |
| `/admin/requests` | Approve / reject / reset pending registrations, tabbed by status |
| `/admin/employees` | Approved staff, filter by role, free-text search, delete, "set up login" |
| `/admin/time-entries` | All clock records; filter by status/month/year/employee; inline edit & delete |
| `/admin/reports` | Monthly per-employee summary + day-by-day matrix; CSV and PDF export |
| `/admin/payroll` | Monthly pay runs — create, edit, delete, mark paid; totals |

### 1.3 Employee portal (`/clock`, `/history`)
Restricted to `sri_lankan_staff` and `manager` roles with `APPROVED` status and a linked Supabase
user. Employees clock in/out via [clock/actions.js](src/app/%28employee%29/clock/actions.js) and view their own
monthly shift history. Entries left open for more than 24 hours are auto-closed at
`clockIn + 9h` and annotated so an admin can correct them.

### 1.4 Login provisioning
[adminSetupEmployeeLoginAction](src/app/admin/%28authed%29/actions.js#L365) uses the Supabase service-role key to find
or create an auth user, links it to the `Driver` row via `userId`, and emails a password-reset
link so the employee sets their own password.

### 1.5 Reporting exports
[/api/reports/csv](src/app/api/reports/csv/route.js) and [/api/reports/pdf](src/app/api/reports/pdf/route.js)
generate a monthly time report. The PDF is rendered server-side with `@react-pdf/renderer`
via [TimeReport.jsx](src/lib/pdf/TimeReport.jsx).

### 1.6 Data model
Three models in [schema.prisma](prisma/schema.prisma): `Driver` (all people, regardless of role),
`Payroll` (unique per driver + month + year), and `TimeEntry` (`OPEN` / `CLOSED`). Timestamps are
stored UTC and rendered in `Asia/Colombo` by [src/lib/time.js](src/lib/time.js).

---

## 2. Security issues

These outrank the performance items — the first one is a live privilege-escalation hole.

### 2.1 CRITICAL — Any logged-in employee is a full admin

There is no admin role check anywhere in the codebase. Two layers both check only
*"is someone authenticated?"*:

- [proxy.js:36](src/lib/supabase/proxy.js#L36) — `if (isAdminPath && !isAdminLogin && !claims)`. Any valid JWT passes.
- [actions.js:16-25](src/app/admin/%28authed%29/actions.js#L16-L25) — `requireAdminEmail()` throws only when `user` is null, then returns the email.

Since [adminSetupEmployeeLoginAction](src/app/admin/%28authed%29/actions.js#L365) hands real Supabase logins to office
staff and managers, **every one of those employees can browse to `/admin` and approve
registrations, delete employees, edit anyone's time entries, and read/modify all payroll data.**
The `/login` action correctly bounces admins away from the employee portal, but the reverse
check does not exist.

**Fix:** introduce an explicit admin identity — an `Admin` table, a `role` column on `Driver`, or
Supabase `app_metadata.role` — and enforce it in *both* the proxy and `requireAdminEmail()`.
Server actions must never rely on the proxy alone; the proxy is a routing convenience, not an
authorization boundary.

### 2.2 HIGH — Report exports leak all employee data to any authenticated user

Both report routes check only `if (!user)`:

- [csv/route.js:34](src/app/api/reports/csv/route.js#L34)
- [pdf/route.js:14](src/app/api/reports/pdf/route.js#L14)

Any employee can `GET /api/reports/csv?month=1&year=2026` and download every colleague's
complete attendance record. Apply the same admin check as 2.1, or scope results to the
caller's own `driverId`.

### 2.3 MEDIUM — Unvalidated `employeeId` in the PDF export

At [pdf/route.js:31-34](src/app/api/reports/pdf/route.js#L31-L34), when `employeeId` is supplied the
`CLOCKABLE` role filter is skipped entirely — the CSV route applies it in both branches, but
the PDF route does not. A caller can pull a report for a `driver`-role record that the UI never
exposes. Harmless in isolation, inconsistent with the sibling route, and it stops mattering only
once 2.2 is fixed.

### 2.4 MEDIUM — Open registration endpoint

`/` accepts unauthenticated POSTs with no rate limit, CAPTCHA, or duplicate detection. A script
can flood the `Driver` table with `PENDING` rows, each consuming a sequential employee ID
(see 3.1). Add rate limiting by IP and consider a duplicate-contact-number check.

### 2.5 LOW — Redirect parameter trusted from query string

[admin/login/actions.js:24](src/app/admin/login/actions.js#L24) guards with `next.startsWith("/admin")`, which is
the right instinct, but `//evil.com/admin` also passes `startsWith` in some parsers. Prefer
validating against a known route list or asserting `next.startsWith("/admin/")` after stripping
leading slashes.

---

## 3. Performance issues

### 3.1 Employee ID allocation is a race-prone full table scan
[employee-id.js:6-14](src/lib/employee-id.js#L6-L14) runs
`SELECT MAX(CAST(SUBSTRING("employeeId" FROM 5) AS INTEGER))` with a regex `WHERE` clause. The
cast and regex make the expression non-indexable, so this is a **sequential scan of `Driver` on
every single registration**. Worse, the read-then-write is not atomic: two concurrent
registrations compute the same next ID, and the code papers over the collision by retrying up to
5 times on `P2002`. Under real concurrency it burns retries and can still fail.

**Fix:** use a Postgres sequence and derive the ID from it, or wrap allocation in a transaction
with `SELECT ... FOR UPDATE` on a counter row. A sequence removes both the scan and the race in
one change.

### 3.2 Report pages fetch every employee, then filter in JavaScript
[reports/page.js:24-28](src/app/admin/%28authed%29/reports/page.js#L24-L28),
[csv/route.js:47-54](src/app/api/reports/csv/route.js#L47-L54), and
[time-entries/page.js:61-69](src/app/admin/%28authed%29/time-entries/page.js#L61-L69) all run
`findMany({ where: { status: "APPROVED" } })` — selecting **all columns for all employees** — then
apply `CLOCKABLE.has(e.jobRole)` in memory. The role filter belongs in the query
(`jobRole: { in: [...] }`), and a `select` clause should limit columns to the four or five actually
used. Right now the payroll and reports pages pull `address`, `contactNumber`, `reviewedByEmail`,
and more for records they immediately discard.

### 3.3 `groupEntriesByDay` recomputed inside render loops
In [TimeReport.jsx:170-180](src/lib/pdf/TimeReport.jsx#L170-L180), `DailyTable` calls
`groupEntriesByDay(empEntries)` **inside the per-day map, for every employee**. For a 31-day month
with 10 employees that is 310 rebuilds of the same `Map` objects. `SummaryTable` and the total row
each rebuild them again. Hoist one `Map` per employee before the loops — this is the single largest
CPU cost in PDF generation.

### 3.4 `daysInMonth` constructs a formatter per iteration
[time.js:121-124](src/lib/time.js#L121-L124) creates a `new Intl.DateTimeFormat(...)` inside the loop
body, so a 31-day month allocates 31 formatters. `Intl` constructors are expensive. Hoist it to
module scope alongside the other formatters already defined there.

### 3.5 `autoCloseStaleEntries` issues N sequential writes
[clock/actions.js:30-51](src/app/%28employee%29/clock/actions.js#L30-L51) loops over open entries and
awaits an `update` per row. It also runs on **every render of `/clock`**
([clock/page.js:23](src/app/%28employee%29/clock/page.js#L23)), not just on clock-in. Normally the list is
empty so cost is one wasted query per page view, but the pattern doesn't scale. Move it to a
scheduled job, or batch the closes.

### 3.6 Everything is `force-dynamic` with no caching
Every admin page sets `export const dynamic = "force-dynamic"`, so each navigation re-runs all
queries. The dashboard alone fires five queries ([page.js:77-86](src/app/admin/%28authed%29/page.js#L77-L86)).
Correct for mutable data, but counts and role lists are good candidates for
`unstable_cache` with tag-based invalidation.

### 3.7 In-memory counts over a truncated result set
[time-entries/page.js:89-93](src/app/admin/%28authed%29/time-entries/page.js#L89-L93) computes tab counts by
filtering the already-fetched array — which was capped at `take: 500`
([line 59](src/app/admin/%28authed%29/time-entries/page.js#L59)). Once a filter matches more than 500 entries the
displayed counts are **silently wrong**, and there is no pagination UI to reach the rest. Use
`groupBy` for counts and add real pagination.

### 3.8 Payroll `aggregate` ignores the active filters
[payroll/page.js:67-73](src/app/admin/%28authed%29/payroll/page.js#L67-L73) passes only `status` to the
aggregate while the table query also filters by month, year, and employee. The "Records in view"
and "Total Net" tiles therefore contradict the table below them whenever any other filter is
active. This is a correctness bug surfacing as a UI inconsistency.

---

## 4. Correctness issues worth fixing

### 4.1 Float columns for money
`basicSalary`, `allowances`, `deductions`, and `netSalary` are `Float`
([schema.prisma:58-61](prisma/schema.prisma#L58-L61)). Binary floating point cannot represent decimal
currency exactly; summing many rows accumulates drift. Use `Decimal @db.Decimal(12, 2)`, or store
integer cents.

### 4.2 Timezone mismatch in report boundaries
Report queries bound the month with `Date.UTC(year, month - 1, 1)`
([reports/page.js:33-34](src/app/admin/%28authed%29/reports/page.js#L33-L34)), but entries are grouped into days
using `Asia/Colombo` (UTC+5:30) via `ymdInOffice`. Shifts in the first 5.5 hours of the 1st and the
last 5.5 hours of the month land in the wrong report. `startOfDayInOffice` already exists in
[time.js](src/lib/time.js#L85) — use it for the range bounds too.

### 4.3 Hardcoded UTC offset
[time.js:94](src/lib/time.js#L94) builds an ISO string with a literal `+05:30`. Correct for Sri Lanka
today, but it silently breaks if the office timezone ever changes or observes DST. Derive the
offset from the `Intl` parts rather than hardcoding it.

### 4.4 `datetime-local` inputs use the browser's timezone
[TimeEntriesTable.jsx:55-61](src/components/admin/TimeEntriesTable.jsx#L55-L61) converts to local time using
`getTimezoneOffset()`, and [actions.js:311](src/app/admin/%28authed%29/actions.js#L311) parses the result with
`new Date(...)` on the server. An admin working from a different timezone than the office will
silently shift the timestamps they edit.

### 4.5 `listUsers` capped at 200
[actions.js:393-396](src/app/admin/%28authed%29/actions.js#L393-L396) looks up existing auth users with
`perPage: 200` and searches only page 1. Past 200 auth users, an existing account won't be found
and `createUser` will fail on the duplicate email. Use the filtered lookup API or paginate.

### 4.6 Unused variables and dead imports
`addHours` is imported in [admin actions](src/app/admin/%28authed%29/actions.js#L6) but never used;
`ymdInOffice` is imported unused in [reports/page.js](src/app/admin/%28authed%29/reports/page.js#L10) and
[csv/route.js](src/app/api/reports/csv/route.js#L11); `monthStart`/`monthEnd` and `scopeHref` are
computed but never read in reports; `JOB_ROLE_LABELS` is unused in
[history/page.js](src/app/%28employee%29/history/page.js#L8). `MONTH_NAMES` is duplicated in
[payroll/page.js:7-20](src/app/admin/%28authed%29/payroll/page.js#L7-L20) instead of imported from `lib/time`.

---

## 5. Recommended improvements

### Priority 1 — Ship before this is used in anger
1. **Add a real admin role and enforce it** in the proxy, the admin layout, every action in
   `admin/(authed)/actions.js`, and both report routes. (§2.1, §2.2)
2. **Replace the employee-ID scan with a Postgres sequence.** (§3.1)
3. **Move money to `Decimal`.** Requires a migration; cheapest to do before real payroll data
   accumulates. (§4.1)
4. **Fix the payroll aggregate filters** — currently displays contradictory numbers. (§3.8)

### Priority 2 — Correctness and scale
5. Push role filters into Prisma queries and add `select` clauses. (§3.2)
6. Fix report month boundaries to use office-timezone bounds. (§4.2)
7. Add pagination to time entries and derive counts via `groupBy`. (§3.7)
8. Hoist the `groupEntriesByDay` and `Intl` allocations out of loops. (§3.3, §3.4)
9. Add rate limiting to the public registration endpoint. (§2.4)

### Priority 3 — Engineering foundations
10. **No tests exist.** Start with the pure logic in `lib/time.js` (timezone boundaries, duration
    math) and the validation branches in the server actions — highest value per unit of effort.
11. **No migration history.** `prisma/migrations/` is absent and the workflow appears to be
    `db push`. Adopt `prisma migrate` before production so schema changes are reviewable and
    reversible.
12. **README is still the `create-next-app` boilerplate.** Document required env vars
    (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`) and the setup steps.
13. **TypeScript is installed but unused** — every source file is `.js`/`.jsx`. Either adopt it
    (Prisma already generates full types) or drop the dependency. Typed `Driver` and `TimeEntry`
    objects would catch most of §4 at compile time.
14. **Consolidate duplicated constants.** `JOB_ROLE_LABELS` and `CLOCKABLE` are redefined in eight
    files; `MONTH_NAMES` in two. Move to a shared `lib/constants.js`.
15. **Rename the `Driver` model.** It now holds drivers, office staff, and managers — `Employee`
    reflects reality and removes a persistent source of confusion.
16. **Add error boundaries and `loading.js`.** Server actions like `deleteDriver` throw raw errors
    with no user-facing handling; dynamic pages show no loading state during data fetches.
17. **Structured logging.** `console.error` scattered through actions gives no request context.

### Feature gaps
18. No audit trail for edits — payroll and time entries are mutable with no history of who
    changed what. For payroll data this is usually a compliance requirement.
19. No bulk operations (approve several registrations, generate payroll for all staff in a month).
20. No employee self-service beyond clock and history — no profile view or correction requests.

---

## 6. Summary

The application is well structured for its size: server actions are consistently validated with a
uniform `{ ok, message, fieldErrors }` result shape, the Prisma schema has sensible indexes on the
columns actually filtered, and the timezone handling in `lib/time.js` shows real care. The UI is
coherent across all seven admin pages.

The dominant risk is not performance — it is **§2.1: there is no distinction between an admin and
an employee.** The moment the "set up login" feature is used for its intended purpose, every
office staff member and manager gains full administrative control over registrations, time
records, and payroll. That should be fixed before anything else on this list.

After that, §3.1 (the table scan and ID race) and §4.1 (float currency) are the two changes that
get harder to make the longer real data accumulates.
