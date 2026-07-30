import { NextResponse } from "next/server";
import { getAuthContext, CLOCKABLE_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  daysInMonth,
  durationMs,
  formatTime,
  formatDuration,
  groupEntriesByDay,
  officeMonthRange,
  MONTH_NAMES,
} from "@/lib/time";


function csvEscape(value) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells) {
  return cells.map(csvEscape).join(",") + "\n";
}

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

  const filteredEmployees = await prisma.driver.findMany({
    where: {
      status: "APPROVED",
      jobRole: { in: [...CLOCKABLE_ROLES] },
      ...(employeeId ? { id: employeeId } : {}),
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, employeeId: true },
  });

  if (employeeId && filteredEmployees.length === 0) {
    return new NextResponse("Employee not found", { status: 404 });
  }

  // Office-local month bounds; see officeMonthRange in lib/time.js.
  const { start, end } = officeMonthRange(year, month);
  const entries = await prisma.timeEntry.findMany({
    where: {
      driverId: { in: filteredEmployees.map((e) => e.id) },
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

  const byEmployee = new Map();
  for (const e of filteredEmployees) {
    byEmployee.set(e.id, []);
  }
  for (const e of entries) {
    const arr = byEmployee.get(e.driverId);
    if (arr) arr.push(e);
  }

  let csv = "";
  csv += row([
    "Fenix Cars — Monthly Time Report",
    `${MONTH_NAMES[month - 1]} ${year}`,
  ]);
  csv += row(["Generated", new Date().toISOString()]);
  csv += "\n";

  // Group each employee's entries by day once and reuse it for both the summary
  // and the detail blocks below; grouping is not free and the result is stable.
  const byDayPerEmployee = new Map(
    filteredEmployees.map((emp) => [
      emp.id,
      groupEntriesByDay(byEmployee.get(emp.id) ?? []),
    ])
  );
  // The calendar is identical for every employee, so build it once.
  const days = daysInMonth(year, month);

  // Per-employee summary
  csv += row(["Summary"]);
  csv += row([
    "Employee ID",
    "Name",
    "Shifts",
    "Days worked",
    "Total hours",
    "Average hours/day",
  ]);
  for (const emp of filteredEmployees) {
    const empEntries = byEmployee.get(emp.id) ?? [];
    const totalMs = empEntries.reduce(
      (sum, e) => sum + (durationMs(e.clockIn, e.clockOut) ?? 0),
      0
    );
    const byDay = byDayPerEmployee.get(emp.id);
    const avg = byDay.size > 0 ? totalMs / byDay.size : 0;
    csv += row([
      emp.employeeId,
      emp.fullName,
      empEntries.length,
      byDay.size,
      (totalMs / 3_600_000).toFixed(2),
      (avg / 3_600_000).toFixed(2),
    ]);
  }
  csv += "\n";

  // Per-employee detail: one block per employee
  for (const emp of filteredEmployees) {
    const empEntries = byEmployee.get(emp.id) ?? [];
    csv += row(["Detail — " + emp.fullName + " (" + emp.employeeId + ")"]);
    csv += row([
      "Date",
      "Day",
      "Clock In",
      "Clock Out",
      "Duration (h)",
      "Duration",
      "Status",
      "Notes",
    ]);
    const byDay = byDayPerEmployee.get(emp.id);
    for (const d of days) {
      const cell = byDay.get(d.ymd);
      if (!cell) {
        csv += row([
          d.ymd,
          d.isWeekend ? "weekend" : "",
          "",
          "",
          "0.00",
          "—",
          "",
          "",
        ]);
        continue;
      }
      for (const e of cell.entries) {
        const dur = durationMs(e.clockIn, e.clockOut);
        csv += row([
          d.ymd,
          d.isWeekend ? "weekend" : "",
          e.clockIn ? formatTime(e.clockIn) : "",
          e.clockOut ? formatTime(e.clockOut) : "",
          dur != null ? (dur / 3_600_000).toFixed(2) : "",
          dur != null ? formatDuration(dur) : "—",
          e.status,
          (e.notes ?? "").replace(/\n/g, " "),
        ]);
      }
    }
    csv += "\n";
  }

  const filename = `fenix-cars-time-report-${year}-${String(month).padStart(2, "0")}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
