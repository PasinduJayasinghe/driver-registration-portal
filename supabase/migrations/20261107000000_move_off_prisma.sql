-- Move data access from Prisma to supabase-js.
--
-- Prisma did several things in application code that supabase-js does not:
-- it generated row ids (cuid) and stamped "updatedAt" on every write, it ran
-- multi-statement transactions, and it could run raw SQL. This migration moves
-- each of those into the database so the app can talk to it purely through
-- the Supabase Data API.
--
-- Purely additive for existing data: no column types change and no rows are
-- rewritten. New rows get uuid-shaped ids; existing cuid ids stay as they are
-- (the column is TEXT, and nothing depends on the id format).

-- ---------------------------------------------------------------------------
-- 1. Database-generated ids and updatedAt
-- ---------------------------------------------------------------------------
-- Timestamps are TIMESTAMP(3) WITHOUT TIME ZONE holding UTC, which is how
-- Prisma stored them. `now() AT TIME ZONE 'utc'` keeps that true regardless of
-- the session's TimeZone setting.

ALTER TABLE "public"."Driver"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN "updatedAt" SET DEFAULT (now() AT TIME ZONE 'utc');

ALTER TABLE "public"."Interview"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN "updatedAt" SET DEFAULT (now() AT TIME ZONE 'utc');

ALTER TABLE "public"."DriverStageEvent"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "public"."Payroll"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN "updatedAt" SET DEFAULT (now() AT TIME ZONE 'utc');

ALTER TABLE "public"."TimeEntry"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN "updatedAt" SET DEFAULT (now() AT TIME ZONE 'utc');

CREATE OR REPLACE FUNCTION "public"."set_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW."updatedAt" := now() AT TIME ZONE 'utc';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER "Driver_set_updated_at"
  BEFORE UPDATE ON "public"."Driver"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "Interview_set_updated_at"
  BEFORE UPDATE ON "public"."Interview"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "Payroll_set_updated_at"
  BEFORE UPDATE ON "public"."Payroll"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "TimeEntry_set_updated_at"
  BEFORE UPDATE ON "public"."TimeEntry"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- ---------------------------------------------------------------------------
-- 2. Employee ID allocation
-- ---------------------------------------------------------------------------
-- Replaces `SELECT nextval('employee_id_seq')`, which the Data API cannot run
-- directly. Returns the raw number; the app formats it as FEN-00001.

CREATE OR REPLACE FUNCTION "public"."next_employee_number"()
RETURNS bigint
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  SELECT nextval('public.employee_id_seq');
$$;

-- ---------------------------------------------------------------------------
-- 3. Pipeline stage moves
-- ---------------------------------------------------------------------------
-- Replaces the prisma.$transaction() in the pipeline actions. A function body
-- runs as a single transaction, so the status change, its audit event and any
-- interview bookkeeping either all happen or none do.
--
-- Which moves are legal is still decided in the app (src/lib/pipeline.js), so
-- the UI and the server share one table. The app passes the status it
-- validated against as p_expected_status; if someone else moved the candidate
-- in the meantime the UPDATE matches nothing and the whole call is rejected,
-- rather than recording a move the app never approved.
--
-- p_review:            'set' records the actor as the decision-maker,
--                      'clear' wipes the previous decision, 'keep' leaves it.
-- p_cancel_open_interviews:  marks every PENDING interview CANCELLED.
-- p_complete_interview_id:   records an outcome on that interview.
-- p_schedule_at:       when not null, books a new interview.

CREATE OR REPLACE FUNCTION "public"."apply_driver_transition"(
  p_driver_id               text,
  p_expected_status         "public"."DriverStatus",
  p_to_status               "public"."DriverStatus",
  p_actor_email             text,
  p_note                    text DEFAULT NULL,
  p_review                  text DEFAULT 'keep',
  p_cancel_open_interviews  boolean DEFAULT false,
  p_complete_interview_id   text DEFAULT NULL,
  p_complete_outcome        "public"."InterviewOutcome" DEFAULT NULL,
  p_complete_notes          text DEFAULT NULL,
  p_schedule_at             timestamptz DEFAULT NULL,
  p_duration_mins           integer DEFAULT 30,
  p_mode                    "public"."InterviewMode" DEFAULT 'IN_PERSON',
  p_location                text DEFAULT NULL,
  p_interviewer_email       text DEFAULT NULL,
  p_interview_notes         text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_now timestamp(3) := now() AT TIME ZONE 'utc';
BEGIN
  IF p_review NOT IN ('set', 'clear', 'keep') THEN
    RAISE EXCEPTION 'p_review must be set, clear or keep (got %)', p_review;
  END IF;

  UPDATE "public"."Driver"
  SET
    "status" = p_to_status,
    "stageChangedAt" = v_now,
    "reviewedAt" = CASE p_review
      WHEN 'set' THEN v_now
      WHEN 'clear' THEN NULL
      ELSE "reviewedAt"
    END,
    "reviewedByEmail" = CASE p_review
      WHEN 'set' THEN p_actor_email
      WHEN 'clear' THEN NULL
      ELSE "reviewedByEmail"
    END
  WHERE "id" = p_driver_id
    AND "status" = p_expected_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate % is no longer at stage %', p_driver_id, p_expected_status
      USING ERRCODE = 'P0002', HINT = 'stage_conflict';
  END IF;

  IF p_cancel_open_interviews THEN
    UPDATE "public"."Interview"
    SET "outcome" = 'CANCELLED', "completedAt" = v_now
    WHERE "driverId" = p_driver_id AND "outcome" = 'PENDING';
  END IF;

  IF p_complete_interview_id IS NOT NULL THEN
    UPDATE "public"."Interview"
    SET "outcome" = p_complete_outcome,
        "completedAt" = v_now,
        "notes" = p_complete_notes
    WHERE "id" = p_complete_interview_id AND "driverId" = p_driver_id;
  END IF;

  IF p_schedule_at IS NOT NULL THEN
    INSERT INTO "public"."Interview" (
      "driverId", "scheduledAt", "durationMins", "mode", "location",
      "interviewerEmail", "notes", "scheduledByEmail"
    ) VALUES (
      p_driver_id, p_schedule_at AT TIME ZONE 'utc', p_duration_mins, p_mode,
      p_location, p_interviewer_email, p_interview_notes, p_actor_email
    );
  END IF;

  INSERT INTO "public"."DriverStageEvent" (
    "driverId", "fromStatus", "toStatus", "actorEmail", "note"
  ) VALUES (
    p_driver_id, p_expected_status, p_to_status, p_actor_email, p_note
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Aggregates
-- ---------------------------------------------------------------------------
-- The Data API has no GROUP BY / SUM, so the counts Prisma computed with
-- groupBy() and aggregate() come from these.

-- Head-count per (status, jobRole). One call serves the dashboard and pipeline
-- (summed by status) and the employee roster (APPROVED, by role).
CREATE OR REPLACE FUNCTION "public"."driver_counts"()
RETURNS TABLE ("status" "public"."DriverStatus", "jobRole" text, "count" bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT d."status", d."jobRole", count(*)
  FROM "public"."Driver" d
  GROUP BY d."status", d."jobRole";
$$;

-- Payroll totals for the same filters as the payroll table. Null arguments
-- mean "no filter".
CREATE OR REPLACE FUNCTION "public"."payroll_summary"(
  p_status       "public"."PayrollStatus" DEFAULT NULL,
  p_period_month integer DEFAULT NULL,
  p_period_year  integer DEFAULT NULL,
  p_driver_id    text DEFAULT NULL
)
RETURNS TABLE ("totalNet" double precision, "totalCount" bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(sum(p."netSalary"), 0), count(*)
  FROM "public"."Payroll" p
  WHERE (p_status IS NULL OR p."status" = p_status)
    AND (p_period_month IS NULL OR p."periodMonth" = p_period_month)
    AND (p_period_year IS NULL OR p."periodYear" = p_period_year)
    AND (p_driver_id IS NULL OR p."driverId" = p_driver_id);
$$;

-- ---------------------------------------------------------------------------
-- 5. Lock the tables down
-- ---------------------------------------------------------------------------
-- Supabase exposes the public schema over its Data API, and the anon key that
-- grants access ships to every browser. Without RLS, anyone holding it could
-- read every driver, payroll and time record directly.
--
-- The app only reads and writes through the server, with the service-role key
-- (which bypasses RLS), after requireAdmin()/requireEmployee() have run. So
-- RLS is enabled with no policies: the Data API refuses anon and signed-in
-- users outright, and the server keeps working.

ALTER TABLE "public"."Driver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Interview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DriverStageEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Payroll" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TimeEntry" ENABLE ROW LEVEL SECURITY;

-- Functions are executable by everyone by default. These are server-only.
REVOKE EXECUTE ON FUNCTION "public"."next_employee_number"() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION "public"."apply_driver_transition"(
  text, "public"."DriverStatus", "public"."DriverStatus", text, text, text,
  boolean, text, "public"."InterviewOutcome", text, timestamptz, integer,
  "public"."InterviewMode", text, text, text
) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION "public"."driver_counts"() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION "public"."payroll_summary"(
  "public"."PayrollStatus", integer, integer, text
) FROM PUBLIC, anon, authenticated;
REVOKE USAGE, SELECT, UPDATE ON SEQUENCE "public"."employee_id_seq" FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION "public"."next_employee_number"() TO service_role;
GRANT EXECUTE ON FUNCTION "public"."apply_driver_transition"(
  text, "public"."DriverStatus", "public"."DriverStatus", text, text, text,
  boolean, text, "public"."InterviewOutcome", text, timestamptz, integer,
  "public"."InterviewMode", text, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION "public"."driver_counts"() TO service_role;
GRANT EXECUTE ON FUNCTION "public"."payroll_summary"(
  "public"."PayrollStatus", integer, integer, text
) TO service_role;
GRANT USAGE ON SEQUENCE "public"."employee_id_seq" TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Remove Prisma's bookkeeping table
-- ---------------------------------------------------------------------------
-- Only held Prisma's record of which migrations had run. It sits in the public
-- schema, so it was also readable over the Data API.
DROP TABLE IF EXISTS "public"."_prisma_migrations";
