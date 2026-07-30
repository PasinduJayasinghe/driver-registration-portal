import { prisma } from "@/lib/prisma";
import DeleteEmployeeButton from "@/components/admin/DeleteEmployeeButton";
import AddEmployeeButton from "@/components/admin/AddEmployeeButton";
import EmployeeAuthLinkButton from "@/components/admin/EmployeeAuthLinkButton";
import Tabs from "@/components/ui/Tabs";
import Pill from "@/components/ui/Pill";
import { CLOCKABLE_ROLES } from "@/lib/auth";

export const dynamic = "force-dynamic";

const JOB_ROLE_LABELS = {
  driver: "Driver",
  sri_lankan_staff: "Sri Lankan Staff",
  manager: "Manager",
};


const ROLE_TABS = [
  { key: "all", label: "All", role: null },
  { key: "driver", label: "Drivers", role: "driver" },
  { key: "sri_lankan_staff", label: "Sri Lankan Staff", role: "sri_lankan_staff" },
  { key: "manager", label: "Managers", role: "manager" },
];

function RoleBadge({ role }) {
  return (
    <Pill tone={role === "manager" ? "info" : "neutral"} dot={false}>
      {JOB_ROLE_LABELS[role] ?? role}
    </Pill>
  );
}

export default async function EmployeesPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const rawRole = typeof params.role === "string" ? params.role : "all";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const activeTab = ROLE_TABS.find((t) => t.key === rawRole) ?? ROLE_TABS[0];

  const where = {
    status: "APPROVED",
    ...(activeTab.role ? { jobRole: activeTab.role } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { employeeId: { contains: q, mode: "insensitive" } },
            { contactNumber: { contains: q } },
          ],
        }
      : {}),
  };

  const [employees, counts] = await Promise.all([
    prisma.driver.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        contactNumber: true,
        email: true,
        jobRole: true,
        userId: true,
        reviewedAt: true,
        reviewedByEmail: true,
      },
    }),
    prisma.driver.groupBy({
      by: ["jobRole"],
      where: { status: "APPROVED" },
      _count: { _all: true },
    }),
  ]);

  const countByRole = counts.reduce((acc, c) => {
    acc[c.jobRole] = c._count._all;
    return acc;
  }, {});
  const totalApproved = counts.reduce((sum, c) => sum + c._count._all, 0);

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Employees
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Approved Fenix Cars team members. Remove anyone who has been let go.
          </p>
        </div>
        <div className="mt-2 md:mt-0">
          <AddEmployeeButton />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col">
        <Tabs
          activeKey={activeTab.key}
          layoutId="employees-tab"
          tabs={ROLE_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            count: tab.role === null ? totalApproved : countByRole[tab.role] ?? 0,
            href: q
              ? `/admin/employees?role=${tab.key}&q=${encodeURIComponent(q)}`
              : `/admin/employees?role=${tab.key}`,
          }))}
        />

        <div className="p-4 border-b border-outline-variant/30">
          <form className="flex items-center gap-2" action="/admin/employees">
            <input type="hidden" name="role" value={activeTab.key} />
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by name, ID, or contact number..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container/70 rounded-full border border-outline-variant/40 text-body-md text-on-surface placeholder:text-on-surface-variant/60 transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-on-primary rounded-full text-label-md font-semibold hover:bg-primary-container transition-colors"
            >
              Search
            </button>
            {q ? (
              <a
                href={`/admin/employees?role=${activeTab.key}`}
                className="px-3 py-2 text-on-surface-variant hover:text-on-surface text-label-md"
              >
                Clear
              </a>
            ) : null}
          </form>
        </div>

        <div className="overflow-x-auto">
          {employees.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              {q
                ? `No employees match "${q}".`
                : "No approved employees yet. Approve a request to see them here."}
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
                    Approved
                  </th>
                  <th className="num">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-body-md">
                {employees.map((e, idx) => (
                  <tr
                    key={e.id}
                    >
                    <td className="text-on-surface font-medium">
                      <div>{e.fullName}</div>
                      <div className="text-label-sm text-on-surface-variant font-mono">
                        {e.employeeId}
                      </div>
                      {e.email ? (
                        <div className="text-label-sm text-on-surface-variant/80">
                          {e.email}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-on-surface-variant">
                      {e.contactNumber}
                    </td>
                    <td>
                      <RoleBadge role={e.jobRole} />
                    </td>
                    <td className="text-on-surface-variant">
                      {e.reviewedAt ? dateFmt.format(e.reviewedAt) : "—"}
                      {e.reviewedByEmail ? (
                        <div className="text-label-sm text-on-surface-variant/80">
                          by {e.reviewedByEmail}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {CLOCKABLE_ROLES.has(e.jobRole) ? (
                          <EmployeeAuthLinkButton driver={e} />
                        ) : null}
                        <DeleteEmployeeButton id={e.id} name={e.fullName} />
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
