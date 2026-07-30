import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import SideNav from "@/components/admin/SideNav";
import TopNav from "@/components/admin/TopNav";
import PageShell from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const { user, isAdmin } = await getAuthContext();

  if (!user) {
    redirect("/admin/login");
  }

  // Employee accounts (those linked to a Driver row) must never reach /admin.
  if (!isAdmin) {
    redirect("/clock");
  }

  return (
    <div className="h-screen overflow-hidden flex bg-background text-on-background">
      <SideNav />
      <div className="flex-1 flex flex-col md:ml-64 h-screen relative bg-surface-container-low">
        <TopNav email={user.email} />
        <main className="flex-1 overflow-y-auto mt-16 p-margin-mobile md:p-margin-desktop">
          <PageShell className="mx-auto w-full max-w-container-max space-y-stack-lg">
            {children}
          </PageShell>
        </main>
      </div>
    </div>
  );
}
