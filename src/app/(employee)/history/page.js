import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: user.id },
    select: { id: true, fullName: true, employeeId: true, jobRole: true },
  });
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
        className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 flex flex-wrap items-end gap-3"
      >
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
          className="px-4 py-2 bg-primary text-on-primary rounded-full text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors"
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

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    In
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Out
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="text-body-md">
                {entries.map((e, idx) => (
                  <tr
                    key={e.id}
                    className={`border-b border-outline-variant/10 ${
                      idx % 2 === 1 ? "bg-surface-bright" : ""
                    }`}
                  >
                    <td className="py-3 px-6 text-on-surface">
                      {formatDate(e.clockIn)}
                    </td>
                    <td className="py-3 px-6 text-on-surface-variant">
                      {formatTime(e.clockIn)}
                    </td>
                    <td className="py-3 px-6 text-on-surface-variant">
                      {e.clockOut ? formatTime(e.clockOut) : "—"}
                    </td>
                    <td className="py-3 px-6 text-on-surface font-semibold">
                      {formatDuration(durationMs(e.clockIn, e.clockOut))}
                    </td>
                    <td className="py-3 px-6 text-on-surface-variant text-label-sm">
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
    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex items-center gap-4 relative overflow-hidden">
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
        <span className="text-label-sm font-semibold tracking-[0.05em] text-on-surface-variant uppercase">
          {label}
        </span>
        <span className="text-title-lg font-bold text-on-surface">{value}</span>
      </div>
    </div>
  );
}
