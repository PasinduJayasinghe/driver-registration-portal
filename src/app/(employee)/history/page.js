import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import {
  formatTime,
  formatDate,
  formatDuration,
  durationMs,
  officeMonthRange,
  ymdInOffice,
  MONTH_NAMES,
} from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }) {
  // Reuses the layout's cached auth context — see the note in @/lib/auth.
  const { driver } = await getAuthContext();
  if (!driver) redirect("/login");

  const params = (await searchParams) ?? {};
  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();

  // Office-local bounds so a late-night shift lands in the month it's shown in.
  const { start, end } = officeMonthRange(year, month);

  const entries = await prisma.timeEntry.findMany({
    where: {
      driverId: driver.id,
      clockIn: { gte: start, lt: end },
    },
    orderBy: { clockIn: "desc" },
    select: {
      id: true,
      clockIn: true,
      clockOut: true,
      notes: true,
    },
  });

  const totalMs = entries.reduce(
    (sum, e) => sum + (durationMs(e.clockIn, e.clockOut) ?? 0),
    0
  );
  const daysWorked = new Set(entries.map((e) => ymdInOffice(e.clockIn))).size;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
          My History
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Your shifts for {MONTH_NAMES[month - 1]} {year}.
        </p>
      </div>

      <form
        action="/history"
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
            {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-on-primary rounded-full text-label-md font-semibold hover:bg-primary-container transition-colors"
        >
          Apply
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <SummaryStat label="Shifts" value={entries.length} icon="event_available" />
        <SummaryStat
          label="Days worked"
          value={daysWorked}
          icon="calendar_today"
        />
        <SummaryStat
          label="Total hours"
          value={formatDuration(totalMs)}
          icon="schedule"
          accent
        />
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col">
        <div className="p-4 border-b border-outline-variant/30">
          <h2 className="text-headline-md text-on-surface">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
        </div>
        {entries.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            No shifts in this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    Date
                  </th>
                  <th>
                    In
                  </th>
                  <th>
                    Out
                  </th>
                  <th>
                    Duration
                  </th>
                  <th>
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="text-body-md">
                {entries.map((e, idx) => (
                  <tr
                    key={e.id}
                    >
                    <td className="text-on-surface">
                      {formatDate(e.clockIn)}
                    </td>
                    <td className="text-on-surface-variant">
                      {formatTime(e.clockIn)}
                    </td>
                    <td className="text-on-surface-variant">
                      {e.clockOut ? formatTime(e.clockOut) : "—"}
                    </td>
                    <td className="text-on-surface font-semibold">
                      {formatDuration(durationMs(e.clockIn, e.clockOut))}
                    </td>
                    <td className="text-on-surface-variant text-label-sm">
                      {e.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryStat({ label, value, icon, accent }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-[var(--shadow-e1)] border border-outline-variant/30 flex items-center gap-4 relative overflow-hidden">
      {accent ? (
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
      ) : null}
      <span
        className={`material-symbols-outlined p-3 rounded-xl text-[28px] ${
          accent
            ? "text-primary bg-primary-container/10"
            : "text-secondary bg-secondary-container/30"
        }`}
      >
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-label-sm font-semibold tracking-[0.08em] text-on-surface-variant uppercase">
          {label}
        </span>
        <span className="text-title-lg font-bold text-on-surface">{value}</span>
      </div>
    </div>
  );
}
