import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthContext, CLOCKABLE_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { officeMonthRange } from "@/lib/time";
import TimeReportPdf from "@/lib/pdf/TimeReport";


export async function GET(request) {
  const { user, isAdmin } = await getAuthContext();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  // These reports cover every employee, so they are admin-only.
  if (!isAdmin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const employeeId = searchParams.get("employeeId") ?? "";

  if (!month || !year || month < 1 || month > 12) {
    return new NextResponse("Invalid month/year", { status: 400 });
  }

  // The role filter applies whether or not employeeId is given: requesting a
  // specific employee must not expose records for roles the report never covers.
  const employees = await prisma.driver.findMany({
    where: {
      status: "APPROVED",
      jobRole: { in: [...CLOCKABLE_ROLES] },
      ...(employeeId ? { id: employeeId } : {}),
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, employeeId: true },
  });

  if (employeeId && employees.length === 0) {
    return new NextResponse("Employee not found", { status: 404 });
  }

  // Office-local month bounds; see officeMonthRange in lib/time.js. UTC bounds
  // would put a late-night shift in a different month than the CSV and the
  // reports page show it in.
  const { start, end } = officeMonthRange(year, month);
  const entries = await prisma.timeEntry.findMany({
    where: {
      driverId: { in: employees.map((e) => e.id) },
      clockIn: { gte: start, lt: end },
    },
    orderBy: { clockIn: "asc" },
    select: {
      driverId: true,
      clockIn: true,
      clockOut: true,
      status: true,
      notes: true,
    },
  });

  // Sanitize for the PDF: convert dates to ISO strings.
  const serialized = entries.map((e) => ({
    driverId: e.driverId,
    clockIn: e.clockIn.toISOString(),
    clockOut: e.clockOut ? e.clockOut.toISOString() : null,
    status: e.status,
    notes: e.notes,
  }));

  const buffer = await renderToBuffer(
    TimeReportPdf({
      employees,
      entries: serialized,
      year,
      month,
    })
  );

  const filename = `fenix-cars-time-report-${year}-${String(month).padStart(2, "0")}${
    employeeId ? "-single" : ""
  }.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
