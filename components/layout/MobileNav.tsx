"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

export function MobileNav({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="flex items-center gap-3 border-b border-subtle bg-surface px-4 py-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Abrir menú">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[232px] p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <Sidebar
            userEmail={userEmail}
            className="w-full border-r-0"
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <span className="font-display text-sm font-semibold tracking-[-0.02em] text-primary">
        CRM
      </span>
    </header>
  );
}
