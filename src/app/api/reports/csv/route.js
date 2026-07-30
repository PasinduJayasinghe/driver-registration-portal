import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  daysInMonth,
  durationMs,
  formatTime,
  formatDuration,
  groupEntriesByDay,
  MONTH_NAMES,
  ymdInOffice,
} from "@/lib/time";

const CLOCKABLE = new Set(["sri_lankan_staff", "manager"]);

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

  const employees = await prisma.driver.findMany({
    where: { status: "APPROVED" },
    orderBy: { fullName: "asc" },
  });
  const clockableEmployees = employees.filter((e) => CLOCKABLE.has(e.jobRole));
  const filteredEmployees = employeeId
    ? clockableEmployees.filter((e) => e.id === employeeId)
    : clockableEmployees;

  if (employeeId && filteredEmployees.length === 0) {
    return new NextResponse("Employee not found", { status: 404 });
  }

  const where = {
    driverId: { in: filteredEmployees.map((e) => e.id) },
    clockIn: {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(year, month, 1)),
    },
  };
  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy: { clockIn: "asc" },
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
    const byDay = groupEntriesByDay(empEntries);
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
    const byDay = groupEntriesByDay(empEntries);
    const days = daysInMonth(year, month);
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
