import { redirect } from "next/navigation";
import { getAuthContext, CLOCKABLE_ROLES } from "@/lib/auth";
import EmployeeNav from "@/components/employee/EmployeeNav";
import PageShell from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({ children }) {
  const { user, driver, isAdmin } = await getAuthContext();

  if (!user) {
    redirect("/login");
  }

  // Admin accounts have no Driver row, so there is nothing to clock.
  if (isAdmin) {
    redirect("/admin");
  }

  if (!driver) {
    redirect("/login?error=not_an_employee");
  }

  if (driver.status !== "APPROVED") {
    redirect("/login?error=inactive");
  }

  if (!CLOCKABLE_ROLES.has(driver.jobRole)) {
    redirect("/login?error=role_not_allowed");
  }

  return (
    <div className="h-screen overflow-hidden flex bg-background text-on-background">
      <EmployeeNav fullName={driver.fullName} employeeId={driver.employeeId} />
      <div className="flex-1 flex flex-col md:ml-64 h-screen relative bg-surface-container-low">
        <header className="h-16 shrink-0 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-outline-variant/25 flex items-center justify-between px-6">
          <div className="text-headline-md text-on-surface tracking-[-0.01em]">
            Staff Portal
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-label-md font-semibold text-on-surface">
                {driver.fullName}
              </div>
              <div className="text-label-sm text-on-surface-variant/80 font-mono tabular">
                {driver.employeeId}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-md font-bold shadow-[var(--shadow-e1)] ring-1 ring-[#191c1d]/5">
              {driver.fullName
                .split(" ")
                .map((s) => s[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop">
          <PageShell className="mx-auto w-full max-w-container-max space-y-stack-lg">
            {children}
          </PageShell>
        </main>
      </div>
    </div>
  );
}
