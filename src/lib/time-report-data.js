import { db, unwrapAll } from "@/lib/db";
import { CLOCKABLE_ROLES } from "@/lib/auth";
import { officeMonthRange } from "@/lib/time";

/**
 * Data behind the monthly time report: the /admin/reports page and its CSV
 * and PDF downloads all render from this, so they can never disagree.
 *
 * Returns { employees, entries } for clock-eligible employees (optionally just
 * one), with entries whose clock-in falls in the given office-local month.
 * Callers must have already checked requireAdmin()/isAdmin.
 */
export async function getMonthlyTimeData({ year, month, employeeId = "" }) {
  // The role filter applies whether or not employeeId is given: requesting a
  // specific employee must not expose records for roles the report never covers.
  const employees = await unwrapAll((opts) => {
    let query = db()
      .from("Driver")
      .select("id, fullName, employeeId", opts)
      .eq("status", "APPROVED")
      .in("jobRole", [...CLOCKABLE_ROLES]);
    if (employeeId) query = query.eq("id", employeeId);
    return query.order("fullName").order("id");
  });

  if (employees.length === 0) return { employees, entries: [] };

  // Month bounds must be office-local: entries are grouped into days in
  // Asia/Colombo, so UTC bounds would pull the wrong shifts in at each edge.
  const { start, end } = officeMonthRange(year, month);
  const entries = await unwrapAll((opts) =>
    db()
      .from("TimeEntry")
      .select("driverId, clockIn, clockOut, status, notes", opts)
      .in(
        "driverId",
        employees.map((e) => e.id)
      )
      .gte("clockIn", start.toISOString())
      .lt("clockIn", end.toISOString())
      .order("clockIn")
      .order("id")
  );

  return { employees, entries };
}
