import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import TimeReportPdf from "@/lib/pdf/TimeReport";

const CLOCKABLE = new Set(["sri_lankan_staff", "manager"]);

export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const employeeId = searchParams.get("employeeId") ?? "";

  if (!month || !year || month < 1 || month > 12) {
    return new NextResponse("Invalid month/year", { status: 400 });
  }

  const allEmployees = await prisma.driver.findMany({
    where: { status: "APPROVED" },
    orderBy: { fullName: "asc" },
  });
  const employees = (
    employeeId
      ? allEmployees.filter((e) => e.id === employeeId)
      : allEmployees.filter((e) => CLOCKABLE.has(e.jobRole))
  ).map((e) => ({
    id: e.id,
    fullName: e.fullName,
    employeeId: e.employeeId,
  }));

  if (employeeId && employees.length === 0) {
    return new NextResponse("Employee not found", { status: 404 });
  }

  const entries = await prisma.timeEntry.findMany({
    where: {
      driverId: { in: employees.map((e) => e.id) },
      clockIn: {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lt: new Date(Date.UTC(year, month, 1)),
      },
    },
    orderBy: { clockIn: "asc" },
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
