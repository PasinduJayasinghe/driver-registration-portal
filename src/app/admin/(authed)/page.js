import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LiftCard, Stagger, StaggerItem } from "@/components/ui/Motion";
import { StatusPill } from "@/components/ui/Pill";

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
  const [statusCounts, recent] = await Promise.all([
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
  ]);

  const countByStatus = statusCounts.reduce((acc, c) => {
    acc[c.status] = c._count._all;
    return acc;
  }, {});
  const pending = countByStatus.PENDING ?? 0;
  const approved = countByStatus.APPROVED ?? 0;
  const rejected = countByStatus.REJECTED ?? 0;
  const total = pending + approved + rejected;

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
            label="Pending Registrations"
            value={pending}
            icon="pending_actions"
            accent
            href="/admin/requests?tab=pending"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Approved Employees"
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
        <StaggerItem>
          <StatCard label="Total Submissions" value={total} icon="groups" />
        </StaggerItem>
      </Stagger>

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
