"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { signOut } from "@/app/admin/login/actions";
import { springSnappy } from "@/lib/motion";

const NAV_ITEMS = [
  { href: "/admin", icon: "dashboard", label: "Overview", key: "overview" },
  { href: "/admin/requests", icon: "person_add", label: "Recruitment", key: "requests" },
  { href: "/admin/employees", icon: "badge", label: "Employees", key: "employees" },
  { href: "/admin/time-entries", icon: "schedule", label: "Time Entries", key: "time-entries" },
  { href: "/admin/reports", icon: "assessment", label: "Reports", key: "reports" },
  { href: "/admin/payroll", icon: "payments", label: "Payroll", key: "payroll" },
];

function NavLink({ href, icon, label, active, reduce }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl group transition-colors duration-[var(--duration-fast)] ease-[var(--ease-ios)] ${
        active
          ? "text-primary"
          : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {/* The active pill is a shared layout element: navigating slides it to
          the new item instead of cross-fading two separate backgrounds. This is
          the detail that makes sidebar nav feel continuous rather than stepped. */}
      {active ? (
        <motion.span
          layoutId={reduce ? undefined : "nav-active-pill"}
          className="absolute inset-0 rounded-xl bg-primary-container/12 border border-primary/15"
          transition={springSnappy}
        />
      ) : (
        <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-surface-variant/60 transition-colors duration-[var(--duration-fast)]" />
      )}
      <span
        className={`material-symbols-outlined relative z-10 text-[21px] transition-transform duration-[var(--duration-base)] ease-[var(--ease-ios)] ${
          active ? "filled" : "group-hover:scale-105"
        }`}
      >
        {icon}
      </span>
      <span
        className={`relative z-10 text-label-md tracking-[0.02em] ${
          active ? "font-bold" : "font-medium"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export default function SideNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  const isRequests = pathname?.startsWith("/admin/requests");
  const isEmployees = pathname?.startsWith("/admin/employees");
  const isPayroll = pathname?.startsWith("/admin/payroll");
  const isTimeEntries = pathname?.startsWith("/admin/time-entries");
  const isReports = pathname?.startsWith("/admin/reports");
  const isOverview =
    !isRequests && !isEmployees && !isPayroll && !isTimeEntries && !isReports;

  const activeKey = isRequests
    ? "requests"
    : isEmployees
      ? "employees"
      : isPayroll
        ? "payroll"
        : isTimeEntries
          ? "time-entries"
          : isReports
            ? "reports"
            : "overview";

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 z-50 flex-col pt-16 bg-surface-container-lowest border-r border-outline-variant/30 hidden md:flex">
      <div className="absolute top-0 left-0 w-full h-16 flex items-center px-6 border-b border-outline-variant/30 bg-surface-container-lowest">
        <span className="text-headline-md text-primary font-bold tracking-[-0.01em]">
          Fenix Cars
        </span>
      </div>

      <div className="px-6 py-4 flex flex-col gap-0.5">
        <div className="text-label-sm uppercase tracking-[0.08em] text-on-surface-variant/70 font-semibold">
          Admin Portal
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={activeKey === item.key}
            reduce={reduce}
          />
        ))}
      </div>

      <div className="border-t border-outline-variant/30 p-3">
        <form action={signOut}>
          <motion.button
            type="submit"
            whileTap={reduce ? undefined : { scale: 0.98 }}
            transition={springSnappy}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-ios)] text-left"
          >
            <span className="material-symbols-outlined text-[21px]">logout</span>
            <span className="text-label-md tracking-[0.02em] font-medium">
              Log out
            </span>
          </motion.button>
        </form>
      </div>
    </nav>
  );
}
