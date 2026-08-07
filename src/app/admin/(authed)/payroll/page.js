import { prisma } from "@/lib/prisma";
import PayrollTable from "@/components/admin/PayrollTable";
import AddPayrollButton from "@/components/admin/AddPayrollButton";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_TABS = [
  { key: "all", label: "All", status: null },
  { key: "pending", label: "Pending", status: "PENDING" },
  { key: "paid", label: "Paid", status: "PAID" },
];

function buildHref({ status, month, year, employeeId, page }) {
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  if (month) sp.set("month", month);
  if (year) sp.set("year", year);
  if (employeeId) sp.set("employeeId", employeeId);
  // Page 1 is the default, so it stays out of the URL.
  if (page && page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/admin/payroll?${qs}` : "/admin/payroll";
}

export default async function PayrollPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const rawStatus = typeof params.status === "string" ? params.status : "all";
  const activeTab = STATUS_TABS.find((t) => t.key === rawStatus) ?? STATUS_TABS[0];

  const month = typeof params.month === "string" ? params.month : "";
  const year = typeof params.year === "string" ? params.year : "";
  const employeeId = typeof params.employeeId === "string" ? params.employeeId : "";

  const monthNum = month ? Number(month) : null;
  const yearNum = year ? Number(year) : null;

  const where = {
    ...(activeTab.status ? { status: activeTab.status } : {}),
    ...(monthNum && monthNum >= 1 && monthNum <= 12 ? { periodMonth: monthNum } : {}),
    ...(yearNum && yearNum >= 2000 && yearNum <= 2100 ? { periodYear: yearNum } : {}),
    ...(employeeId ? { driverId: employeeId } : {}),
  };

  const page = Math.max(1, Number(params.page) || 1);
  const PAGE_SIZE = 100;

  const [records, employees, aggregate] = await Promise.all([
    prisma.payroll.findMany({
      where,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      // Explicit select rather than include: the table below uses a fixed set
      // of fields, so there's no reason to ship every Payroll column over a
      // long-haul connection.
      select: {
        id: true,
        driverId: true,
        periodMonth: true,
        periodYear: true,
        basicSalary: true,
        allowances: true,
        deductions: true,
        netSalary: true,
        status: true,
        paidDate: true,
        notes: true,
        driver: { select: { id: true, fullName: true, employeeId: true } },
      },
    }),
    prisma.driver.findMany({
      where: { status: "APPROVED" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeId: true },
    }),
    // Must use the same `where` as the table above, otherwise the summary tiles
    // contradict the rows on screen whenever a filter is active.
    prisma.payroll.aggregate({
      _sum: { netSalary: true },
      _count: { _all: true },
      where,
    }),
  ]);

  const totalNet = Number(aggregate?._sum?.netSalary ?? 0);
  // Counted across the whole filter, not just this page — the aggregate above
  // deliberately shares `where` with the table query, so it doubles as the
  // pagination total without a separate count().
  const totalCount = aggregate?._count?._all ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const serialized = records.map((r) => ({
    id: r.id,
    driverId: r.driverId,
    periodMonth: r.periodMonth,
    periodYear: r.periodYear,
    periodLabel: `${MONTH_NAMES[r.periodMonth - 1]} ${r.periodYear}`,
    basicSalary: r.basicSalary,
    allowances: r.allowances,
    deductions: r.deductions,
    netSalary: r.netSalary,
    status: r.status,
    paidDate: r.paidDate ? r.paidDate.toISOString() : null,
    paidDateLabel: r.paidDate ? dateFmt.format(r.paidDate) : null,
    notes: r.notes,
    driver: {
      id: r.driver.id,
      fullName: r.driver.fullName,
      employeeId: r.driver.employeeId,
    },
  }));

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    fullName: e.fullName,
    employeeId: e.employeeId,
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear + 1; y >= currentYear - 4; y -= 1) {
    yearOptions.push(y);
  }

  return (
    <>
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Payroll
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Track monthly pay runs for every Fenix Cars employee.
          </p>
        </div>
        <div className="mt-2 md:mt-0">
          <AddPayrollButton employees={employeeOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <SummaryStat
          label="Records in view"
          value={totalCount}
          icon="receipt_long"
        />
        <SummaryStat
          label="Total Net"
          value={`LKR ${totalNet.toLocaleString("en-LK", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon="payments"
          accent
        />
        <SummaryStat
          label="Approved employees"
          value={employees.length}
          icon="groups"
        />
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col">
        <div className="px-2 pt-2 border-b border-outline-variant/30 flex flex-wrap gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.key === activeTab.key;
            const sp = new URLSearchParams();
            if (tab.status) sp.set("status", tab.key);
            if (month) sp.set("month", month);
            if (year) sp.set("year", year);
            if (employeeId) sp.set("employeeId", employeeId);
            const qs = sp.toString();
            const href = qs ? `/admin/payroll?${qs}` : "/admin/payroll";
            return (
              <a
                key={tab.key}
                href={href}
                className={`px-4 py-3 text-label-md font-semibold tracking-[0.08em] uppercase border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </div>

        <div className="p-4 border-b border-outline-variant/30">
          <form
            action="/admin/payroll"
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          >
            <input type="hidden" name="status" value={activeTab.key} />
            <div className="flex flex-col gap-1">
              <label htmlFor="month" className="text-label-sm text-on-surface-variant">
                Month
              </label>
              <select
                id="month"
                name="month"
                defaultValue={month}
                className="px-3.5 py-2.5 bg-surface-container/70 rounded-xl border border-outline-variant/50 text-body-md text-on-surface transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
              >
                <option value="">All months</option>
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
                className="px-3.5 py-2.5 bg-surface-container/70 rounded-xl border border-outline-variant/50 text-body-md text-on-surface transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
              >
                <option value="">All years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="employeeId" className="text-label-sm text-on-surface-variant">
                Employee
              </label>
              <select
                id="employeeId"
                name="employeeId"
                defaultValue={employeeId}
                className="px-3.5 py-2.5 bg-surface-container/70 rounded-xl border border-outline-variant/50 text-body-md text-on-surface transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
              >
                <option value="">All employees</option>
                {employeeOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-on-primary rounded-full text-label-md font-semibold hover:bg-primary-container transition-colors"
              >
                Apply
              </button>
              {month || year || employeeId ? (
                <a
                  href={buildHref({ status: activeTab.key === "all" ? null : activeTab.key })}
                  className="px-3 py-2 text-on-surface-variant hover:text-on-surface text-label-md"
                >
                  Clear
                </a>
              ) : null}
            </div>
          </form>
        </div>

        <PayrollTable records={serialized} employees={employeeOptions} />

        {totalPages > 1 ? (
          <div className="p-4 border-t border-outline-variant/30 flex items-center justify-between gap-3">
            <span className="text-label-sm text-on-surface-variant">
              Page {page} of {totalPages} · {totalCount} records
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <a
                  href={buildHref({
                    status: activeTab.key === "all" ? null : activeTab.key,
                    month,
                    year,
                    employeeId,
                    page: page - 1,
                  })}
                  className="px-3 py-1.5 rounded-full border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors"
                >
                  Previous
                </a>
              ) : null}
              {page < totalPages ? (
                <a
                  href={buildHref({
                    status: activeTab.key === "all" ? null : activeTab.key,
                    month,
                    year,
                    employeeId,
                    page: page + 1,
                  })}
                  className="px-3 py-1.5 rounded-full border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors"
                >
                  Next
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function SummaryStat({ label, value, icon, accent }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-[var(--shadow-e1)] border border-outline-variant/30 flex items-center gap-4 relative overflow-hidden">
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
        <span className="text-label-sm font-semibold tracking-[0.08em] text-on-surface-variant uppercase">
          {label}
        </span>
        <span className="text-title-lg font-bold text-on-surface">{value}</span>
      </div>
    </div>
  );
}
