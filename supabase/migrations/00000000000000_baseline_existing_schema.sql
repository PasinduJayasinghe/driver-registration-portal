-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."DriverStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."PayrollStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "public"."TimeEntryStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "public"."Driver" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "jobRole" TEXT NOT NULL,
    "status" "public"."DriverStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "userId" TEXT,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payroll" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "status" "public"."PayrollStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeEntry" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "status" "public"."TimeEntryStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Driver_createdAt_idx" ON "public"."Driver"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_employeeId_key" ON "public"."Driver"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "Driver_jobRole_idx" ON "public"."Driver"("jobRole" ASC);

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "public"."Driver"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "public"."Driver"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_driverId_periodMonth_periodYear_key" ON "public"."Payroll"("driverId" ASC, "periodMonth" ASC, "periodYear" ASC);

-- CreateIndex
CREATE INDEX "Payroll_periodYear_periodMonth_idx" ON "public"."Payroll"("periodYear" ASC, "periodMonth" ASC);

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "public"."Payroll"("status" ASC);

-- CreateIndex
CREATE INDEX "TimeEntry_clockIn_idx" ON "public"."TimeEntry"("clockIn" ASC);

-- CreateIndex
CREATE INDEX "TimeEntry_driverId_clockIn_idx" ON "public"."TimeEntry"("driverId" ASC, "clockIn" ASC);

-- CreateIndex
CREATE INDEX "TimeEntry_status_idx" ON "public"."TimeEntry"("status" ASC);

-- AddForeignKey
ALTER TABLE "public"."Payroll" ADD CONSTRAINT "Payroll_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEntry" ADD CONSTRAINT "TimeEntry_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
