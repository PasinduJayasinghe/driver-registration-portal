import { prisma } from "@/lib/prisma";
import {
  approveDriver,
  rejectDriver,
  resetDriver,
} from "@/app/admin/(authed)/actions";

export const dynamic = "force-dynamic";

const JOB_ROLE_LABELS = {
  driver: "Driver",
  sri_lankan_staff: "Sri Lankan Staff",
  manager: "Manager",
};

const STATUS_TABS = [
  { key: "pending", label: "Pending", status: "PENDING" },
  { key: "approved", label: "Approved", status: "APPROVED" },
  { key: "rejected", label: "Rejected", status: "REJECTED" },
  { key: "all", label: "All", status: null },
];

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

function ActionButtons({ driver }) {
  if (driver.status === "PENDING") {
    return (
      <div className="flex items-center gap-2">
        <form action={approveDriver}>
          <input type="hidden" name="id" value={driver.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-label-sm font-semibold tracking-[0.05em] hover:bg-green-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              check
            </span>
            Approve
          </button>
        </form>
        <form action={rejectDriver}>
          <input type="hidden" name="id" value={driver.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error text-on-error text-label-sm font-semibold tracking-[0.05em] hover:bg-on-error-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              close
            </span>
            Reject
          </button>
        </form>
      </div>
    );
  }
  return (
    <form action={resetDriver}>
      <input type="hidden" name="id" value={driver.id} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline text-on-surface-variant text-label-sm font-semibold tracking-[0.05em] hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">undo</span>
        Move to pending
      </button>
    </form>
  );
}

export default async function RequestsPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const rawTab = typeof params.tab === "string" ? params.tab : "pending";
  const activeTab = STATUS_TABS.find((t) => t.key === rawTab) ?? STATUS_TABS[0];

  const where = activeTab.status ? { status: activeTab.status } : {};
  const [drivers, counts] = await Promise.all([
    prisma.driver.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
    prisma.driver.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countMap = counts.reduce((acc, c) => {
    acc[c.status] = c._count._all;
    return acc;
  }, {});
  const total = (countMap.PENDING ?? 0) + (countMap.APPROVED ?? 0) + (countMap.REJECTED ?? 0);

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
          Employee Requests
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Review pending driver registrations and decide who joins Fenix Cars.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
        <div className="px-2 pt-2 border-b border-outline-variant/30 flex flex-wrap gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.key === activeTab.key;
            const count =
              tab.status === null
                ? total
                : countMap[tab.status] ?? 0;
            return (
              <a
                key={tab.key}
                href={`/admin/requests?tab=${tab.key}`}
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

        <div className="overflow-x-auto">
          {drivers.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              No {activeTab.label.toLowerCase()} requests right now.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Role
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-body-md">
                {drivers.map((driver, idx) => (
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
                      {driver.contactNumber}
                    </td>
                    <td className="py-4 px-6 text-on-surface-variant">
                      {JOB_ROLE_LABELS[driver.jobRole] ?? driver.jobRole}
                    </td>
                    <td className="py-4 px-6 text-on-surface-variant">
                      {dateFmt.format(driver.createdAt)}
                    </td>
                    <td className="py-4 px-6">
                      <StatusPill status={driver.status} />
                      {driver.reviewedByEmail ? (
                        <div className="text-label-sm text-on-surface-variant mt-1">
                          by {driver.reviewedByEmail}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end">
                        <ActionButtons driver={driver} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
