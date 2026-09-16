import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export type Breadcrumb = {
  label: string;
  href?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  backHref,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  backHref?: string;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-subtle px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            aria-label="Migas de pan"
            className="flex flex-wrap items-center gap-1 text-[11px] text-muted"
          >
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <span aria-hidden>/</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-secondary">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-secondary">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="flex items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Volver"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-hover hover:text-primary"
            >
              <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} />
            </Link>
          ) : null}
          <h1 className="font-display text-[28px] leading-none font-semibold tracking-[-0.02em] text-primary">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="text-xs text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
