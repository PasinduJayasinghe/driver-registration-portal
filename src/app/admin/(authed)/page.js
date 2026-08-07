import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LiftCard, Stagger, StaggerItem } from "@/components/ui/Motion";
import Pill, { StatusPill } from "@/components/ui/Pill";
import { formatDateTime } from "@/lib/time";
import {
  ACTIVE_STAGES,
  PIPELINE_ORDER,
  STAGE_META,
  STAGES,
  daysWaiting,
  isStalled,
  interviewTiming,
} from "@/lib/pipeline";

export const dynamic = "force-dynamic";

const JOB_ROLE_LABELS = {
  driver: "Driver",
  sri_lankan_staff: "Sri Lankan Staff",
  manager: "Manager",
};

function StatCard({ label, value, icon, accent, href }) {
  const content = (
    <>
      <div className="flex justify-between items-start gap-3">
        <div className="text-label-sm font-semibold tracking-[0.08em] text-on-surface-variant/75 uppercase">
          {label}
        </div>
        <span
          className={`material-symbols-outlined text-[20px] p-1.5 rounded-lg shrink-0 transition-transform duration-[var(--duration-base)] ease-[var(--ease-ios)] group-hover:scale-110 ${
            accent
              ? "text-primary bg-primary-container/12"
              : "text-secondary bg-secondary-container/40"
          }`}
        >
          {icon}
        </span>
      </div>
      {/* Tabular figures so the number doesn't reflow as counts change, and
          tight tracking because large numerals set too loose at this size. */}
      <div className="text-[40px] leading-[44px] font-extrabold tracking-[-0.03em] text-on-surface tabular">
        {value}
      </div>
      {href ? (
        <div className="flex items-center gap-1 text-label-sm font-semibold text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-[var(--duration-base)] ease-[var(--ease-ios)]">
          View
          <span className="material-symbols-outlined text-[14px]">
            arrow_forward
          </span>
        </div>
      ) : null}
    </>
  );

  const className =
    "bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-3 relative overflow-hidden group shadow-[var(--shadow-e1)] transition-shadow duration-[var(--duration-base)] ease-[var(--ease-ios)]";

  if (href) {
    return (
      <LiftCard as="div" className={`${className} hover:shadow-[var(--shadow-e3)]`}>
        <Link href={href} className="absolute inset-0 z-10" aria-label={label} />
        {content}
      </LiftCard>
    );
  }
  return <div className={className}>{content}</div>;
}

export default async function AdminOverviewPage() {
  // One grouped query instead of four separate COUNT(*) round-trips.
  const [statusCounts, recent, upcomingInterviews, activeCandidates] =
    await Promise.all([
      prisma.driver.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.driver.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          fullName: true,
          employeeId: true,
          jobRole: true,
          status: true,
          createdAt: true,
        },
      }),
      // Live bookings only. Ordered soonest-first so anything overdue surfaces
      // at the top rather than being buried under next month's slots.
      prisma.interview.findMany({
        where: { outcome: "PENDING", driver: { status: "INTERVIEW_SCHEDULED" } },
        orderBy: { scheduledAt: "asc" },
        take: 6,
        select: {
          id: true,
          scheduledAt: true,
          mode: true,
          location: true,
          driver: { select: { id: true, fullName: true, employeeId: true } },
        },
      }),
      // Everyone still mid-process. Bounded because the stall check needs each
      // row's own stage threshold, which isn't expressible as a single COUNT.
      prisma.driver.findMany({
        where: { status: { in: ACTIVE_STAGES } },
        orderBy: [{ stageChangedAt: "asc" }, { createdAt: "asc" }],
        take: 200,
        select: {
          id: true,
          fullName: true,
          employeeId: true,
          status: true,
          stageChangedAt: true,
          createdAt: true,
        },
      }),
    ]);

  const countByStatus = statusCounts.reduce((acc, c) => {
    acc[c.status] = c._count._all;
    return acc;
  }, {});
  const pending = countByStatus.PENDING ?? 0;
  const approved = countByStatus.APPROVED ?? 0;
  const rejected = countByStatus.REJECTED ?? 0;
  const total = statusCounts.reduce((sum, c) => sum + c._count._all, 0);
  const inPipeline = ACTIVE_STAGES.reduce(
    (sum, s) => sum + (countByStatus[s] ?? 0),
    0
  );

  // Single clock reading so every relative time on the page agrees.
  const now = new Date();

  const stalled = activeCandidates.filter((c) =>
    isStalled(c.status, c.stageChangedAt ?? c.createdAt, now)
  );
  const overdueInterviews = upcomingInterviews.filter(
    (i) => interviewTiming(i.scheduledAt, now) === "overdue"
  );
  const attentionCount = stalled.length + overdueInterviews.length;

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
          Overview Dashboard
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Here is the current operational status for Fenix Cars.
        </p>
      </div>

      <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-gutter lg:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="New Applications"
            value={pending}
            icon="pending_actions"
            accent
            href="/admin/requests?tab=pending"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="In Pipeline"
            value={inPipeline}
            icon="conveyor_belt"
            href="/admin/requests?tab=shortlisted"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Employees"
            value={approved}
            icon="badge"
            href="/admin/employees"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Rejected"
            value={rejected}
            icon="block"
            href="/admin/requests?tab=rejected"
          />
        </StaggerItem>
      </Stagger>

      {/* Needs attention. This is the panel that earns the pipeline its keep:
          a funnel nobody checks silently drops candidates, so the two failure
          modes — an interview whose outcome was never recorded, and someone
          parked at a stage — are surfaced before they become lost applicants. */}
      {attentionCount > 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-error/30 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center gap-3">
            <span className="material-symbols-outlined p-2 rounded-lg text-error bg-error-container/40">
              priority_high
            </span>
            <div className="flex flex-col">
              <h2 className="text-headline-md text-on-surface">
                Needs attention
              </h2>
              <p className="text-label-sm text-on-surface-variant">
                {attentionCount} item{attentionCount === 1 ? "" : "s"} waiting on
                you.
              </p>
            </div>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {overdueInterviews.map((i) => (
              <div
                key={i.id}
                className="px-6 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex flex-col">
                  <span className="text-body-md text-on-surface font-medium">
                    {i.driver.fullName}
                  </span>
                  <span className="text-label-sm text-on-surface-variant">
                    Interview was {formatDateTime(i.scheduledAt)} — no outcome
                    recorded
                  </span>
                </div>
                <Link
                  href="/admin/requests?tab=interview_scheduled"
                  className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-label-sm font-semibold hover:bg-primary-container transition-colors"
                >
                  Record outcome
                </Link>
              </div>
            ))}
            {stalled.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="px-6 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex flex-col">
                  <span className="text-body-md text-on-surface font-medium">
                    {c.fullName}
                  </span>
                  <span className="text-label-sm text-on-surface-variant">
                    {STAGE_META[c.status]?.nextAction ?? "Waiting"} ·{" "}
                    {daysWaiting(c.stageChangedAt ?? c.createdAt, now)} days at{" "}
                    {STAGE_META[c.status]?.label ?? c.status}
                  </span>
                </div>
                <Link
                  href={`/admin/requests?tab=${c.status.toLowerCase()}`}
                  className="px-3 py-1.5 rounded-full border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Funnel + what's coming up. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-headline-md text-on-surface">
              Recruitment funnel
            </h2>
            <Link
              href="/admin/requests"
              className="text-label-md font-semibold text-primary hover:underline"
            >
              Open pipeline
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {PIPELINE_ORDER.map((status) => {
              const meta = STAGE_META[status];
              const count = countByStatus[status] ?? 0;
              // Bars are scaled against the largest stage, not the total, so a
              // small stage is still readable next to a big one.
              const max = Math.max(
                1,
                ...PIPELINE_ORDER.map((s) => countByStatus[s] ?? 0)
              );
              const pct = Math.round((count / max) * 100);
              return (
                <Link
                  key={status}
                  href={`/admin/requests?tab=${status.toLowerCase()}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-container/60 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">
                    {meta.icon}
                  </span>
                  <span className="text-label-md text-on-surface-variant w-32 shrink-0">
                    {meta.label}
                  </span>
                  <span className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${
                        status === STAGES.APPROVED
                          ? "bg-green-600"
                          : status === STAGES.REJECTED
                            ? "bg-error/60"
                            : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="text-label-md font-bold text-on-surface tabular w-10 text-right">
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="text-label-sm text-on-surface-variant/80">
            {total} total application{total === 1 ? "" : "s"} · only candidates
            at <strong className="text-on-surface">Hired</strong> appear in
            Employees, payroll and time tracking.
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined p-2 rounded-lg text-primary bg-primary-container/10">
              event_upcoming
            </span>
            <h2 className="text-headline-md text-on-surface">Interviews</h2>
          </div>
          {upcomingInterviews.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">
              Nothing booked. Shortlist a candidate to schedule one.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingInterviews.slice(0, 5).map((i) => {
                const timing = interviewTiming(i.scheduledAt, now);
                return (
                  <div key={i.id} className="flex flex-col gap-0.5">
                    <span className="text-body-md text-on-surface font-medium">
                      {i.driver.fullName}
                    </span>
                    <span className="text-label-sm text-on-surface-variant">
                      {formatDateTime(i.scheduledAt)}
                    </span>
                    {timing === "overdue" ? (
                      <Pill tone="negative">Outcome overdue</Pill>
                    ) : timing === "today" || timing === "in_progress" ? (
                      <Pill tone="warning">Today</Pill>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined p-2 rounded-lg text-primary bg-primary-container/10">
              schedule
            </span>
            <h2 className="text-headline-md text-on-surface">Time Tracking</h2>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Office staff clock in/out, see their history, and admins generate
            monthly reports.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            <Link
              href="/admin/time-entries"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary text-label-sm font-semibold hover:bg-primary-container transition-colors"
            >
              View time entries
            </Link>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors"
            >
              Monthly reports
            </Link>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined p-2 rounded-lg text-secondary bg-secondary-container/30">
              payments
            </span>
            <h2 className="text-headline-md text-on-surface">Payroll</h2>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Track monthly pay runs for every Fenix Cars employee. Mark as Paid
            when the bank transfer clears.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            <Link
              href="/admin/payroll"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary text-label-sm font-semibold hover:bg-primary-container transition-colors"
            >
              Open payroll
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col lg:col-span-3">
          <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
            <h2 className="text-headline-md text-on-surface">Recent Activity</h2>
            <Link
              href="/admin/requests"
              className="text-label-md font-semibold text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            {recent.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant">
                No registrations yet. Share the registration link with your
                team to get started.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      Employee
                    </th>
                    <th>
                      Role
                    </th>
                    <th>
                      Date
                    </th>
                    <th>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="text-body-md">
                  {recent.map((driver, idx) => (
                    <tr
                      key={driver.id}
                    >
                      <td className="text-on-surface font-medium">
                        <div>{driver.fullName}</div>
                        <div className="text-label-sm text-on-surface-variant">
                          {driver.employeeId}
                        </div>
                      </td>
                      <td className="text-on-surface-variant">
                        {JOB_ROLE_LABELS[driver.jobRole] ?? driver.jobRole}
                      </td>
                      <td className="text-on-surface-variant">
                        {dateFmt.format(driver.createdAt)}
                      </td>
                      <td>
                        <StatusPill status={driver.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
