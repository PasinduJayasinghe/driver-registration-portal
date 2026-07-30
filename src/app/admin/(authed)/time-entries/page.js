import { prisma } from "@/lib/prisma";
import TimeEntriesTable from "@/components/admin/TimeEntriesTable";
import { MONTH_NAMES, officeMonthRange } from "@/lib/time";
import { CLOCKABLE_ROLES } from "@/lib/auth";

export const dynamic = "force-dynamic";


const STATUS_TABS = [
  { key: "all", label: "All", status: null },
  { key: "open", label: "Open", status: "OPEN" },
  { key: "closed", label: "Closed", status: "CLOSED" },
];

function buildHref({ status, employeeId, month, year, scope, page }) {
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  if (employeeId) sp.set("employeeId", employeeId);
  if (month) sp.set("month", month);
  if (year) sp.set("year", year);
  if (scope) sp.set("scope", scope);
  // Page 1 is the default, so it stays out of the URL.
  if (page && page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/admin/time-entries?${qs}` : "/admin/time-entries";
}

export default async function TimeEntriesPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const rawStatus = typeof params.status === "string" ? params.status : "all";
  const activeTab = STATUS_TABS.find((t) => t.key === rawStatus) ?? STATUS_TABS[0];

  const employeeId = typeof params.employeeId === "string" ? params.employeeId : "";
  const month = typeof params.month === "string" ? params.month : "";
  const year = typeof params.year === "string" ? params.year : "";
  const scope = typeof params.scope === "string" ? params.scope : "office";

  const monthNum = month ? Number(month) : null;
  const yearNum = year ? Number(year) : null;

  // Office-local month bounds so entries near midnight on the 1st/last day of
  // the month are filtered into the month the UI shows them in.
  const range =
    monthNum && yearNum ? officeMonthRange(yearNum, monthNum) : null;

  const page = Math.max(1, Number(params.page) || 1);
  const PAGE_SIZE = 100;

  // Every filter except the status tab. Counts are derived from this so each
  // tab shows its true total rather than a count of the current tab's rows.
  const baseWhere = {
    ...(employeeId ? { driverId: employeeId } : {}),
    ...(range ? { clockIn: { gte: range.start, lt: range.end } } : {}),
    // Scope is applied in the query instead of discarding rows after the fact,
    // which previously let the `take` limit be consumed by filtered-out rows.
    ...(scope === "office"
      ? { driver: { jobRole: { in: [...CLOCKABLE_ROLES] } } }
      : {}),
  };

  const where = {
    ...baseWhere,
    ...(activeTab.status ? { status: activeTab.status } : {}),
  };

  const [entries, employees, statusCounts, totalMatching] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      orderBy: { clockIn: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
        status: true,
        notes: true,
        driver: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            jobRole: true,
          },
        },
      },
    }),
    prisma.driver.findMany({
      where: {
        status: "APPROVED",
        ...(scope === "office"
          ? { jobRole: { in: [...CLOCKABLE_ROLES] } }
          : {}),
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeId: true },
    }),
    // Aggregate in the database so counts stay correct beyond one page.
    prisma.timeEntry.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.timeEntry.count({ where }),
  ]);

  const filteredEmployees = employees;

  const serialized = entries.map((e) => ({
    id: e.id,
    clockIn: e.clockIn.toISOString(),
    clockOut: e.clockOut ? e.clockOut.toISOString() : null,
    status: e.status,
    notes: e.notes,
    driver: e.driver,
  }));

  const openCount =
    statusCounts.find((c) => c.status === "OPEN")?._count?._all ?? 0;
  const closedCount =
    statusCounts.find((c) => c.status === "CLOSED")?._count?._all ?? 0;
  const counts = {
    all: openCount + closedCount,
    open: openCount,
    closed: closedCount,
  };

  const totalPages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear + 1; y >= currentYear - 4; y -= 1) {
    yearOptions.push(y);
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
          Time Entries
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          All clock-in / clock-out records for office staff. Edit or delete
          individual entries if an employee forgot to clock out.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
        <div className="px-2 pt-2 border-b border-outline-variant/30 flex flex-wrap gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.key === activeTab.key;
            const sp = new URLSearchParams();
            if (tab.status) sp.set("status", tab.key);
            if (employeeId) sp.set("employeeId", employeeId);
            if (month) sp.set("month", month);
            if (year) sp.set("year", year);
            if (scope) sp.set("scope", scope);
            const qs = sp.toString();
            const href = qs ? `/admin/time-entries?${qs}` : "/admin/time-entries";
            const count =
              tab.status === null ? counts.all : counts[tab.key] ?? 0;
            return (
              <a
                key={tab.key}
                href={href}
                className={`px-4 py-3 text-label-md font-semibold tracking-[0.05em] uppercase border-b-2 transition-colors flex items-center gap-2 ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab.label}
                <span
                  className={`text-label-sm px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-primary-container/20 text-primary"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {count}
                </span>
              </a>
            );
          })}
        </div>

        <div className="p-4 border-b border-outline-variant/30">
          <form
            action="/admin/time-entries"
            className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
          >
            <input type="hidden" name="status" value={activeTab.key} />
            <div className="flex flex-col gap-1">
              <label htmlFor="scope" className="text-label-sm text-on-surface-variant">
                Show
              </label>
              <select
                id="scope"
                name="scope"
                defaultValue={scope}
                className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="office">Office staff & managers</option>
                <option value="all">All employees</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="month" className="text-label-sm text-on-surface-variant">
                Month
              </label>
              <select
                id="month"
                name="month"
                defaultValue={month}
                className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="">All months</option>
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
                className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="">All years</option>
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
                className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="">All employees</option>
                {filteredEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-on-primary rounded-full text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors"
              >
                Apply
              </button>
              {month || year || employeeId || scope !== "office" ? (
                <a
                  href={buildHref({ status: activeTab.key === "all" ? null : activeTab.key })}
                  className="px-3 py-2 text-on-surface-variant hover:text-on-surface text-label-md"
                >
                  Clear
                </a>
              ) : null}
            </div>
          </form>
        </div>

        <TimeEntriesTable entries={serialized} />

        {totalPages > 1 ? (
          <div className="p-4 border-t border-outline-variant/30 flex items-center justify-between gap-3">
            <span className="text-label-sm text-on-surface-variant">
              Page {page} of {totalPages} · {totalMatching} entries
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <a
                  href={buildHref({
                    status: activeTab.key === "all" ? null : activeTab.key,
                    employeeId,
                    month,
                    year,
                    scope,
                    page: page - 1,
                  })}
                  className="px-3 py-1.5 rounded-full border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors"
                >
                  Previous
                </a>
              ) : null}
              {page < totalPages ? (
                <a
                  href={buildHref({
                    status: activeTab.key === "all" ? null : activeTab.key,
                    employeeId,
                    month,
                    year,
                    scope,
                    page: page + 1,
                  })}
                  className="px-3 py-1.5 rounded-full border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors"
                >
                  Next
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
