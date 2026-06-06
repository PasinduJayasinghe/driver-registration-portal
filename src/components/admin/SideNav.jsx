"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/admin/login/actions";

function NavLink({ href, icon, label, active }) {
  if (active) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 px-6 py-3 text-primary font-bold border-l-4 border-primary bg-primary-container/10 transition-all duration-200 ease-in-out"
      >
        <span className="material-symbols-outlined filled">{icon}</span>
        <span className="text-label-md tracking-[0.05em]">{label}</span>
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-6 py-3 text-on-secondary-container border-l-4 border-transparent hover:bg-surface-variant transition-all duration-200 ease-in-out hover:pl-8"
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="text-label-md tracking-[0.05em]">{label}</span>
    </Link>
  );
}

export default function SideNav() {
  const pathname = usePathname();
  const isRequests = pathname?.startsWith("/admin/requests");
  const isEmployees = pathname?.startsWith("/admin/employees");
  const isOverview = !isRequests && !isEmployees;

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 z-50 flex-col pt-16 bg-surface-container border-r border-outline-variant/30 hidden md:flex">
      <div className="absolute top-0 left-0 w-full h-16 flex items-center px-6 border-b border-outline-variant/30 bg-surface-container-lowest">
        <span className="text-headline-md text-primary font-bold">
          Fenix Cars
        </span>
      </div>

      <div className="px-6 py-stack-md flex flex-col gap-1 border-b border-outline-variant/30">
        <div className="text-body-md font-medium text-on-surface">
          Admin Portal
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-stack-md flex flex-col gap-2">
        <NavLink
          href="/admin"
          icon="dashboard"
          label="Overview"
          active={isOverview}
        />
        <NavLink
          href="/admin/requests"
          icon="person_add"
          label="Employee Requests"
          active={isRequests}
        />
        <NavLink
          href="/admin/employees"
          icon="badge"
          label="Employees"
          active={isEmployees}
        />
      </div>

      <div className="border-t border-outline-variant/30 py-4 flex flex-col gap-1">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-6 py-2 text-on-surface-variant hover:text-primary transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[20px]">
              Log Out
            </span>
          </button>
        </form>
      </div>
    </nav>
  );
}
