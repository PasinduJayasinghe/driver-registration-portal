-- Talent & onboarding pipeline.
--
-- Purely additive. Existing rows are untouched: every current APPROVED driver
-- stays APPROVED and therefore stays a working employee (clock access, payroll,
-- reports, /admin/employees all filter on APPROVED and are unaffected).
-- PENDING and REJECTED likewise keep their meaning.
--
-- The new stages sit BETWEEN PENDING and APPROVED in the funnel, so nobody
-- reaches "employee" without an explicit hire decision from now on.

-- Enum values are appended in funnel order via AFTER so that ORDER BY "status"
-- sorts pipeline-wise rather than by insertion order.
-- Postgres 12+ permits ADD VALUE inside a transaction as long as the new value
-- is not *referenced* in the same transaction. Nothing below references them
-- (no backfill is needed), so this is safe under Prisma's transactional runner.
ALTER TYPE "public"."DriverStatus" ADD VALUE IF NOT EXISTS 'SHORTLISTED' AFTER 'PENDING';
ALTER TYPE "public"."DriverStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW_SCHEDULED' AFTER 'SHORTLISTED';
ALTER TYPE "public"."DriverStatus" ADD VALUE IF NOT EXISTS 'INTERVIEWED' AFTER 'INTERVIEW_SCHEDULED';

-- CreateEnum
CREATE TYPE "public"."InterviewMode" AS ENUM ('IN_PERSON', 'PHONE', 'VIDEO');

-- CreateEnum
CREATE TYPE "public"."InterviewOutcome" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'NO_SHOW', 'CANCELLED');

-- AlterTable
-- Nullable: existing rows have no meaningful stage-entry timestamp, and the app
-- falls back to createdAt when this is null rather than inventing one.
ALTER TABLE "public"."Driver" ADD COLUMN "stageChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."Interview" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 30,
    "mode" "public"."InterviewMode" NOT NULL DEFAULT 'IN_PERSON',
    "location" TEXT,
    "interviewerEmail" TEXT,
    "outcome" "public"."InterviewOutcome" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "scheduledByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DriverStageEvent" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "fromStatus" "public"."DriverStatus",
    "toStatus" "public"."DriverStatus" NOT NULL,
    "actorEmail" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverStageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interview_driverId_scheduledAt_idx" ON "public"."Interview"("driverId", "scheduledAt");
CREATE INDEX "Interview_scheduledAt_idx" ON "public"."Interview"("scheduledAt");
CREATE INDEX "Interview_outcome_idx" ON "public"."Interview"("outcome");
CREATE INDEX "DriverStageEvent_driverId_createdAt_idx" ON "public"."DriverStageEvent"("driverId", "createdAt");
CREATE INDEX "DriverStageEvent_createdAt_idx" ON "public"."DriverStageEvent"("createdAt");
CREATE INDEX "Driver_status_stageChangedAt_idx" ON "public"."Driver"("status", "stageChangedAt");

-- AddForeignKey
ALTER TABLE "public"."Interview" ADD CONSTRAINT "Interview_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."DriverStageEvent" ADD CONSTRAINT "DriverStageEvent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
