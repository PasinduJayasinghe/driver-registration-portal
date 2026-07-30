import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import EmployeeNav from "@/components/employee/EmployeeNav";

const CLOCKABLE_ROLES = new Set(["sri_lankan_staff", "manager"]);

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      fullName: true,
      employeeId: true,
      jobRole: true,
      status: true,
    },
  });

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
        <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between px-6">
          <div className="text-headline-md text-on-surface">Staff Portal</div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-label-md font-semibold text-on-surface">
                {driver.fullName}
              </div>
              <div className="text-label-sm text-on-surface-variant font-mono">
                {driver.employeeId}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">
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
        <main className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop space-y-stack-lg">
          {children}
        </main>
      </div>
    </div>
  );
}
