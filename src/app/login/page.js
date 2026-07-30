import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext, CLOCKABLE_ROLES } from "@/lib/auth";
import EmployeeLoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function EmployeeLoginPage() {
  const { user, driver, isAdmin } = await getAuthContext();

  if (user) {
    // An admin who lands here is already signed in — send them to their portal.
    if (isAdmin) {
      redirect("/admin");
    }
    if (
      driver &&
      driver.status === "APPROVED" &&
      CLOCKABLE_ROLES.has(driver.jobRole)
    ) {
      redirect("/clock");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="material-symbols-outlined text-[40px] text-primary">
            schedule
          </span>
          <h1 className="text-headline-md text-on-surface">Fenix Cars Staff</h1>
          <p className="text-body-md text-on-surface-variant">
            Sign in to clock in and out of your shifts.
          </p>
        </div>

        <EmployeeLoginForm />

        <div className="border-t border-outline-variant/30 pt-4 text-center">
          <p className="text-label-sm text-on-surface-variant">
            Admin?{" "}
            <Link
              href="/admin/login"
              className="text-primary font-semibold hover:underline"
            >
              Use the admin sign-in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
