import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const JOB_ROLE_LABELS = {
  technician: "Service Technician",
  sales: "Sales Associate",
  manager: "Branch Manager",
  support: "Customer Support",
};

function StatusPill({ status }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm bg-green-100 text-green-800 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
        Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm bg-error-container text-on-error-container border border-error-container/50">
        <span className="w-1.5 h-1.5 rounded-full bg-error" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm bg-primary-container/20 text-on-primary-fixed-variant border border-primary-container/30">
      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      Pending
    </span>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
      {accent ? (
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
      ) : null}
      <div className="flex justify-between items-start">
        <div className="text-label-md font-semibold tracking-[0.05em] text-on-surface-variant uppercase">
          {label}
        </div>
        <span
          className={`material-symbols-outlined p-2 rounded-lg ${
            accent
              ? "text-primary bg-primary-container/10"
              : "text-secondary bg-secondary-container/30"
          }`}
        >
          {icon}
        </span>
      </div>
      <div className="text-display-lg font-extrabold text-on-surface mt-2">
        {value}
      </div>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const [pending, approved, rejected, total, recent] = await Promise.all([
    prisma.driver.count({ where: { status: "PENDING" } }),
    prisma.driver.count({ where: { status: "APPROVED" } }),
    prisma.driver.count({ where: { status: "REJECTED" } }),
    prisma.driver.count(),
    prisma.driver.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter lg:grid-cols-4">
        <StatCard
          label="Pending Registrations"
          value={pending}
          icon="pending_actions"
          accent
        />
        <StatCard label="Approved Drivers" value={approved} icon="badge" />
        <StatCard label="Rejected" value={rejected} icon="block" />
        <StatCard label="Total Submissions" value={total} icon="groups" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col lg:col-span-3">
          <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
            <h2 className="text-headline-md text-on-surface">Recent Activity</h2>
            <Link
              href="/admin/requests"
              className="text-label-md font-semibold tracking-[0.05em] text-primary hover:underline"
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30">
                    <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Role
                    </th>
                    <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Date
                    </th>
                    <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="text-body-md">
                  {recent.map((driver, idx) => (
                    <tr
                      key={driver.id}
                      className={`border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors ${
                        idx % 2 === 1 ? "bg-surface-bright" : ""
                      }`}
                    >
                      <td className="py-4 px-6 text-on-surface font-medium">
                        <div>{driver.fullName}</div>
                        <div className="text-label-sm text-on-surface-variant">
                          {driver.employeeId}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant">
                        {JOB_ROLE_LABELS[driver.jobRole] ?? driver.jobRole}
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant">
                        {dateFmt.format(driver.createdAt)}
                      </td>
                      <td className="py-4 px-6">
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
