"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FolderKanban,
  Home,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/contactos", label: "Contactos", icon: Users },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/gastos", label: "Gastos", icon: Receipt },
];

const SETTINGS_ITEM: NavItem = {
  href: "/ajustes",
  label: "Ajustes",
  icon: Settings,
};

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
        active
          ? "bg-hover text-accent"
          : "text-secondary hover:bg-hover hover:text-primary",
      )}
    >
      {active ? (
        <span className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
      ) : null}
      <Icon
        aria-hidden
        className={cn("size-4", active ? "text-accent" : "text-secondary")}
        strokeWidth={1.5}
      />
      {item.label}
    </Link>
  );
}

export function Sidebar({
  userEmail,
  className,
  onNavigate,
}: {
  userEmail: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "h-full w-[232px] shrink-0 flex-col gap-0.5 border-r border-subtle bg-surface",
        className,
      )}
    >
      <div className="px-5 py-5">
        <span className="font-display text-base font-semibold tracking-[-0.02em] text-primary">
          CRM
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-0.5">
        <div className="px-3">
          <SidebarLink
            item={SETTINGS_ITEM}
            active={isActive(pathname, SETTINGS_ITEM.href)}
            onNavigate={onNavigate}
          />
        </div>
        <div className="border-t border-subtle px-5 py-4">
          <p className="truncate text-xs text-secondary">{userEmail}</p>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="text-xs text-muted transition-colors hover:text-primary"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
