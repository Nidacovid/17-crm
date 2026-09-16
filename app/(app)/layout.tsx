import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function AppLayout({
  children,
  panel,
}: {
  children: ReactNode;
  panel: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email ?? "";

  return (
    <div className="flex h-svh w-full overflow-hidden bg-base">
      <Sidebar userEmail={userEmail} className="hidden md:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      {panel}
    </div>
  );
}
