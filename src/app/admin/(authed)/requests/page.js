import { prisma } from "@/lib/prisma";
import Tabs from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/Pill";
import {
  approveDriver,
  rejectDriver,
  resetDriver,
} from "../actions";

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

const LICENCE_TYPE_LABELS = {
  full_uk: "Full UK",
  provisional_uk: "Provisional UK",
  eu: "EU",
  international: "International",
  other: "Other",
};

function DriverDetails({ driver }) {
  const hasAny =
    driver.nationality ||
    driver.yearsOfExperience != null ||
    driver.licenceNumber ||
    driver.licenceType;

  if (!hasAny) {
    return <span className="text-on-surface-variant/60">—</span>;
  }

  return (
    <div className="flex flex-col gap-0.5 text-label-sm">
      {driver.nationality ? <div>{driver.nationality}</div> : null}
      {driver.yearsOfExperience != null ? (
        <div>
          {driver.yearsOfExperience}{" "}
          {driver.yearsOfExperience === 1 ? "year" : "years"} experience
        </div>
      ) : null}
      {driver.licenceNumber ? (
        <div className="font-mono text-on-surface-variant/80">
          {driver.licenceNumber}
        </div>
      ) : null}
      {driver.licenceType ? (
        <div className="text-on-surface-variant/80">
          {LICENCE_TYPE_LABELS[driver.licenceType] ?? driver.licenceType}
        </div>
      ) : null}
    </div>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-label-sm font-semibold hover:bg-green-700 transition-colors"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error text-on-error text-label-sm font-semibold hover:bg-on-error-container transition-colors"
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors"
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
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        contactNumber: true,
        email: true,
        address: true,
        jobRole: true,
        status: true,
        createdAt: true,
        reviewedByEmail: true,
        nationality: true,
        yearsOfExperience: true,
        licenceNumber: true,
        licenceType: true,
      },
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

      <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col">
        <Tabs
          activeKey={activeTab.key}
          layoutId="requests-tab"
          tabs={STATUS_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            count: tab.status === null ? total : countMap[tab.status] ?? 0,
            href: `/admin/requests?tab=${tab.key}`,
          }))}
        />

        <div className="overflow-x-auto">
          {drivers.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              No {activeTab.label.toLowerCase()} requests right now.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    Employee
                  </th>
                  <th>
                    Contact
                  </th>
                  <th>
                    Role
                  </th>
                  <th>
                    Driver Details
                  </th>
                  <th>
                    Submitted
                  </th>
                  <th>
                    Status
                  </th>
                  <th className="num">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-body-md">
                {drivers.map((driver, idx) => (
                  <tr
                    key={driver.id}
                    >
                    <td className="text-on-surface font-medium">
                      <div>{driver.fullName}</div>
                      <div className="text-label-sm text-on-surface-variant">
                        {driver.employeeId}
                      </div>
                      {driver.email ? (
                        <div className="text-label-sm text-on-surface-variant/80">
                          {driver.email}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-on-surface-variant">
                      <div>{driver.contactNumber}</div>
                      {driver.address ? (
                        <div className="text-label-sm text-on-surface-variant/80">
                          {driver.address}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-on-surface-variant">
                      {JOB_ROLE_LABELS[driver.jobRole] ?? driver.jobRole}
                    </td>
                    <td className="text-on-surface-variant">
                      <DriverDetails driver={driver} />
                    </td>
                    <td className="text-on-surface-variant">
                      {dateFmt.format(driver.createdAt)}
                    </td>
                    <td>
                      <StatusPill status={driver.status} />
                      {driver.reviewedByEmail ? (
                        <div className="text-label-sm text-on-surface-variant mt-1">
                          by {driver.reviewedByEmail}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-right">
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
