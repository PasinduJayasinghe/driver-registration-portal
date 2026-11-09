# Fenix Cars Portal

Next.js (App Router) portal for Fenix Cars: public driver registration, the
recruitment pipeline, employee roster, payroll, staff clock-in/out and monthly
time reports. Data and auth are both on Supabase.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>          # auth sessions only
   SUPABASE_SERVICE_ROLE_KEY=<service role key>      # server-side data access
   NEXT_PUBLIC_SITE_URL=http://localhost:3000        # used in password-set emails
   ```

   The service-role key bypasses row level security. It is only read by
   [src/lib/db.js](src/lib/db.js), which is server-only. Never prefix it with
   `NEXT_PUBLIC_`.

3. Apply the database migrations in [supabase/migrations](supabase/migrations),
   in filename order, either with the Supabase CLI (`supabase db push`) or by
   pasting them into the dashboard's SQL editor.

4. Run the dev server:

   ```bash
   npm run dev
   ```

## How data access works

- All reads and writes go through the Supabase Data API from server code, using
  the client and helpers in [src/lib/db.js](src/lib/db.js). Every table has RLS
  enabled with no policies, so the public anon key cannot read or write data.
- Authorization is done in code: every admin action and route calls
  `requireAdmin()`, every staff action calls `requireEmployee()`
  ([src/lib/auth.js](src/lib/auth.js)). An authenticated user with no `Driver`
  row is an admin.
- Operations that must be atomic, or that the Data API can't express, are
  Postgres functions called with `db().rpc(...)`: `apply_driver_transition`
  (pipeline stage moves plus their audit event and interview changes),
  `next_employee_number`, `driver_counts` and `payroll_summary`.

## Accounts

- **Admins** are created in the Supabase dashboard (Authentication → Users) and
  sign in at `/admin/login`.
- **Staff logins** are created from `/admin/employees` → "Set up login", which
  links the auth user to their `Driver` row and emails them a password-set link.
  They sign in at `/login`.
