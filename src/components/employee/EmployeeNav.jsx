"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { employeeSignOut } from "@/app/login/actions";
import { springSnappy } from "@/lib/motion";

function NavLink({ href, icon, label, active, reduce }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl group transition-colors duration-[var(--duration-fast)] ease-[var(--ease-ios)] ${
        active ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {/* Shared layout pill — slides between items instead of cross-fading. */}
      {active ? (
        <motion.span
          layoutId={reduce ? undefined : "employee-nav-pill"}
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

export default function EmployeeNav({ fullName, employeeId }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const isHistory = pathname?.startsWith("/history");
  const isClock = !isHistory;

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 z-50 flex-col pt-16 bg-surface-container-lowest border-r border-outline-variant/30 hidden md:flex">
      <div className="absolute top-0 left-0 w-full h-16 flex items-center px-6 border-b border-outline-variant/30 bg-surface-container-lowest">
        <span className="text-headline-md text-primary font-bold tracking-[-0.01em]">
          Fenix Cars
        </span>
      </div>

      <div className="px-6 py-4 flex flex-col gap-1 border-b border-outline-variant/30">
        <div className="text-label-sm font-semibold tracking-[0.08em] text-on-surface-variant/70 uppercase">
          Staff Portal
        </div>
        <div className="text-body-md font-semibold text-on-surface truncate">
          {fullName}
        </div>
        {employeeId ? (
          <div className="text-label-sm text-on-surface-variant/80 font-mono tabular">
            {employeeId}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
        <NavLink
          href="/clock"
          icon="schedule"
          label="Clock"
          active={isClock}
          reduce={reduce}
        />
        <NavLink
          href="/history"
          icon="history"
          label="My History"
          active={isHistory}
          reduce={reduce}
        />
      </div>

      <div className="border-t border-outline-variant/30 p-3">
        <form action={employeeSignOut}>
          <motion.button
            type="submit"
            whileTap={reduce ? undefined : { scale: 0.98 }}
            transition={springSnappy}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-ios)] text-left"
          >
            <span className="material-symbols-outlined text-[21px]">logout</span>
            <span className="text-label-md tracking-[0.02em] font-medium">
              Sign out
            </span>
          </motion.button>
        </form>
      </div>
    </nav>
  );
}
