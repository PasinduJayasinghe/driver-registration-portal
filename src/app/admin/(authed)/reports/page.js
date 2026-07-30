import { prisma } from "@/lib/prisma";
import DownloadButtons from "@/components/admin/DownloadButtons";
import { CLOCKABLE_ROLES } from "@/lib/auth";
import {
  daysInMonth,
  formatTime,
  formatDuration,
  durationMs,
  groupEntriesByDay,
  officeMonthRange,
  MONTH_NAMES,
} from "@/lib/time";

export const dynamic = "force-dynamic";


export default async function ReportsPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();
  const employeeId = typeof params.employeeId === "string" ? params.employeeId : "";

  // Filter by role in the query rather than fetching every approved employee
  // and discarding most of them in JS.
  const clockableEmployees = await prisma.driver.findMany({
    where: {
      status: "APPROVED",
      jobRole: { in: [...CLOCKABLE_ROLES] },
      ...(employeeId ? { id: employeeId } : {}),
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, employeeId: true },
  });

  // Month bounds must be office-local: entries are grouped into days in
  // Asia/Colombo, so UTC bounds would pull the wrong shifts in at each edge.
  const { start: monthStart, end: monthEnd } = officeMonthRange(year, month);

  const entries = await prisma.timeEntry.findMany({
    where: {
      driverId: { in: clockableEmployees.map((e) => e.id) },
      clockIn: { gte: monthStart, lt: monthEnd },
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

  const employeeSummaries = buildSummaries(entries, clockableEmployees);
  const days = daysInMonth(year, month);

  const yearOptions = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 4; y -= 1) {
    yearOptions.push(y);
  }

  return (
    <>
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Monthly Report
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            {MONTH_NAMES[month - 1]} {year} for office staff & managers.
          </p>
        </div>
        <div className="mt-2 md:mt-0">
          <DownloadButtons
            csvHref={`/api/reports/csv?month=${month}&year=${year}${
              employeeId ? `&employeeId=${employeeId}` : ""
            }`}
            pdfHref={`/api/reports/pdf?month=${month}&year=${year}${
              employeeId ? `&employeeId=${employeeId}` : ""
            }`}
          />
        </div>
      </div>

      <form
        action="/admin/reports"
        className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 p-4 flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="month" className="text-label-sm text-on-surface-variant">
            Month
          </label>
          <select
            id="month"
            name="month"
            defaultValue={month}
            className="px-3.5 py-2.5 bg-surface-container/70 rounded-xl border border-outline-variant/50 text-body-md text-on-surface transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
          >
            {MONTH_NAMES.map((n, i) => (
              <option key={i + 1} value={i + 1}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="year" className="text-label-sm text-on-surface-variant">
            Year
          </label>
          <select
            id="year"
            name="year"
            defaultValue={year}
            className="px-3.5 py-2.5 bg-surface-container/70 rounded-xl border border-outline-variant/50 text-body-md text-on-surface transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="employeeId" className="text-label-sm text-on-surface-variant">
            Employee
          </label>
          <select
            id="employeeId"
            name="employeeId"
            defaultValue={employeeId}
            className="px-3.5 py-2.5 bg-surface-container/70 rounded-xl border border-outline-variant/50 text-body-md text-on-surface transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
          >
            <option value="">All office staff</option>
            {clockableEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName} ({e.employeeId})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-on-primary rounded-full text-label-md font-semibold hover:bg-primary-container transition-colors"
        >
          Apply
        </button>
      </form>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col">
        <div className="p-4 border-b border-outline-variant/30">
          <h2 className="text-headline-md text-on-surface">
            Per-employee summary
          </h2>
        </div>
        {employeeSummaries.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            No employees in the office staff filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    Employee
                  </th>
                  <th>
                    Shifts
                  </th>
                  <th>
                    Days worked
                  </th>
                  <th>
                    Total
                  </th>
                  <th>
                    Avg / day
                  </th>
                </tr>
              </thead>
              <tbody className="text-body-md">
                {employeeSummaries.map((s, idx) => (
                  <tr
                    key={s.driverId}
                    >
                    <td className="text-on-surface font-medium">
                      <div>{s.fullName}</div>
                      <div className="text-label-sm text-on-surface-variant font-mono">
                        {s.employeeId}
                      </div>
                    </td>
                    <td className="text-on-surface-variant">
                      {s.shiftCount}
                    </td>
                    <td className="text-on-surface-variant">
                      {s.daysWorked}
                    </td>
                    <td className="text-on-surface font-semibold">
                      {formatDuration(s.totalMs)}
                    </td>
                    <td className="text-on-surface-variant">
                      {s.daysWorked > 0
                        ? formatDuration(Math.round(s.totalMs / s.daysWorked))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col">
        <div className="p-4 border-b border-outline-variant/30">
          <h2 className="text-headline-md text-on-surface">
            Day-by-day — {MONTH_NAMES[month - 1]} {year}
          </h2>
        </div>
        {employeeSummaries.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">No data.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table text-label-md">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20">
                    Date
                  </th>
                  {employeeSummaries.map((s) => (
                    <th
                      key={s.driverId}
                      
                    >
                      {s.fullName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  // Weekend shading is the only row background here. It used to
                  // compete with zebra striping, which meant a weekend landing
                  // on an odd row was indistinguishable from a weekday.
                  <tr
                    key={d.ymd}
                    className={d.isWeekend ? "bg-surface-container-low/60" : ""}
                  >
                    <td className="text-on-surface font-medium sticky left-0 bg-inherit">
                      {MONTH_NAMES[month - 1].slice(0, 3)} {d.dayOfMonth}
                      {d.isWeekend ? (
                        <span className="ml-2 text-label-sm text-on-surface-variant">
                          weekend
                        </span>
                      ) : null}
                    </td>
                    {employeeSummaries.map((s) => {
                      const cell = s.byDay.get(d.ymd);
                      if (!cell) {
                        return (
                          <td
                            key={s.driverId}
                            className="text-on-surface-variant/60"
                          >
                            —
                          </td>
                        );
                      }
                      const first = cell.entries[0];
                      return (
                        <td
                          key={s.driverId}
                          className="text-on-surface"
                        >
                          <div className="font-mono text-label-sm">
                            {formatTime(first.clockIn)} –{" "}
                            {first.clockOut
                              ? formatTime(first.clockOut)
                              : "(open)"}
                          </div>
                          <div className="text-label-sm text-on-surface-variant">
                            {formatDuration(cell.totalMs)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-surface-container-low font-semibold">
                  <td className="text-on-surface sticky left-0 bg-surface-container-low">
                    Total
                  </td>
                  {employeeSummaries.map((s) => (
                    <td
                      key={s.driverId}
                      className="text-on-surface"
                    >
                      <div>{formatDuration(s.totalMs)}</div>
                      <div className="text-label-sm font-normal text-on-surface-variant">
                        {s.daysWorked} days, {s.shiftCount} shifts
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function buildSummaries(entries, employees) {
  const byEmployee = new Map();
  for (const e of employees) {
    byEmployee.set(e.id, {
      driverId: e.id,
      fullName: e.fullName,
      employeeId: e.employeeId,
      entries: [],
    });
  }
  for (const e of entries) {
    const bucket = byEmployee.get(e.driverId);
    if (bucket) bucket.entries.push(e);
  }
  return Array.from(byEmployee.values()).map((b) => {
    const totalMs = b.entries.reduce(
      (sum, e) => sum + (durationMs(e.clockIn, e.clockOut) ?? 0),
      0
    );
    const byDay = groupEntriesByDay(b.entries);
    const daysWorked = byDay.size;
    return {
      driverId: b.driverId,
      fullName: b.fullName,
      employeeId: b.employeeId,
      shiftCount: b.entries.length,
      daysWorked,
      totalMs,
      byDay,
    };
  });
}
