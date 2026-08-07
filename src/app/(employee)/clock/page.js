import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import ClockButton from "@/app/(employee)/clock/ClockButton";
import { formatTime, formatDateTime, formatDuration, durationMs } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ClockPage() {
  // Shares the layout's cached lookup rather than re-authenticating and
  // re-querying the driver row, which used to cost two extra round trips.
  const { driver } = await getAuthContext();
  if (!driver) redirect("/login");

  // NOTE: auto-closing stale entries used to run here, blocking first paint on
  // a write path that is a no-op almost every time. It now runs on clock-in,
  // which is the only moment a forgotten open entry actually blocks anything.
  const [openEntry, recent] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { driverId: driver.id, status: "OPEN" },
    }),
    prisma.timeEntry.findMany({
      where: { driverId: driver.id, status: "CLOSED" },
      orderBy: { clockOut: "desc" },
      take: 5,
    }),
  ]);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? "Good morning"
      : greetingHour < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
          {greeting}, {driver.fullName.split(" ")[0]}
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          {openEntry
            ? "You are currently on the clock."
            : "You are off the clock. Tap the button below to start your shift."}
        </p>
      </div>

      <ClockButton openEntry={openEntry} />

      <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col">
        <div className="p-4 border-b border-outline-variant/30">
          <h2 className="text-headline-md text-on-surface">Recent Shifts</h2>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            No completed shifts yet.
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
                </tr>
              </thead>
              <tbody className="text-body-md">
                {recent.map((e, idx) => (
                  <tr
                    key={e.id}
                    >
                    <td className="text-on-surface">
                      {formatDateTime(e.clockIn).split(",")[0]}
                    </td>
                    <td className="text-on-surface-variant">
                      {formatTime(e.clockIn)}
                    </td>
                    <td className="text-on-surface-variant">
                      {formatTime(e.clockOut)}
                    </td>
                    <td className="text-on-surface font-semibold">
                      {formatDuration(durationMs(e.clockIn, e.clockOut))}
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
