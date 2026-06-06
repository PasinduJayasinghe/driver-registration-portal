import { prisma } from "@/lib/prisma";
import DeleteEmployeeButton from "@/components/admin/DeleteEmployeeButton";
import AddEmployeeButton from "@/components/admin/AddEmployeeButton";

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
  const label = JOB_ROLE_LABELS[role] ?? role;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm bg-secondary-container text-on-secondary-container border border-secondary-container/50">
      {label}
    </span>
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

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
        <div className="px-2 pt-2 border-b border-outline-variant/30 flex flex-wrap gap-1 overflow-x-auto">
          {ROLE_TABS.map((tab) => {
            const isActive = tab.key === activeTab.key;
            const count =
              tab.role === null ? totalApproved : countByRole[tab.role] ?? 0;
            const href = q
              ? `/admin/employees?role=${tab.key}&q=${encodeURIComponent(q)}`
              : `/admin/employees?role=${tab.key}`;
            return (
              <a
                key={tab.key}
                href={href}
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
                className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary text-body-md placeholder:text-on-surface-variant/70 transition-shadow"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-on-primary rounded-full text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors"
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
                    Approved
                  </th>
                  <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-body-md">
                {employees.map((e, idx) => (
                  <tr
                    key={e.id}
                    className={`border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors ${
                      idx % 2 === 1 ? "bg-surface-bright" : ""
                    }`}
                  >
                    <td className="py-4 px-6 text-on-surface font-medium">
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
                    <td className="py-4 px-6 text-on-surface-variant">
                      {e.contactNumber}
                    </td>
                    <td className="py-4 px-6">
                      <RoleBadge role={e.jobRole} />
                    </td>
                    <td className="py-4 px-6 text-on-surface-variant">
                      {e.reviewedAt ? dateFmt.format(e.reviewedAt) : "—"}
                      {e.reviewedByEmail ? (
                        <div className="text-label-sm text-on-surface-variant/80">
                          by {e.reviewedByEmail}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end">
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
