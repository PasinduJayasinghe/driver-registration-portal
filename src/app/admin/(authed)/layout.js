import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SideNav from "@/components/admin/SideNav";
import TopNav from "@/components/admin/TopNav";

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="h-screen overflow-hidden flex bg-background text-on-background">
      <SideNav />
      <div className="flex-1 flex flex-col md:ml-64 h-screen relative bg-surface-container-low">
        <TopNav email={user.email} />
        <main className="flex-1 overflow-y-auto mt-16 p-margin-mobile md:p-margin-desktop space-y-stack-lg">
          {children}
        </main>
      </div>
    </div>
  );
}
