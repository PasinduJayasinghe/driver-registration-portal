import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { autoCloseStaleEntries } from "@/app/(employee)/clock/actions";
import ClockButton from "@/app/(employee)/clock/ClockButton";
import { formatTime, formatDateTime, formatDuration, durationMs } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ClockPage() {
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

  await autoCloseStaleEntries();

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

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
        <div className="p-4 border-b border-outline-variant/30">
          <h2 className="text-headline-md text-on-surface">Recent Shifts</h2>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            No completed shifts yet.
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
                </tr>
              </thead>
              <tbody className="text-body-md">
                {recent.map((e, idx) => (
                  <tr
                    key={e.id}
                    className={`border-b border-outline-variant/10 ${
                      idx % 2 === 1 ? "bg-surface-bright" : ""
                    }`}
                  >
                    <td className="py-3 px-6 text-on-surface">
                      {formatDateTime(e.clockIn).split(",")[0]}
                    </td>
                    <td className="py-3 px-6 text-on-surface-variant">
                      {formatTime(e.clockIn)}
                    </td>
                    <td className="py-3 px-6 text-on-surface-variant">
                      {formatTime(e.clockOut)}
                    </td>
                    <td className="py-3 px-6 text-on-surface font-semibold">
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
