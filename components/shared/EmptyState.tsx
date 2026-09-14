import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <Icon aria-hidden className="size-6 text-muted" strokeWidth={1.5} />
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-primary">{title}</p>
        <p className="text-xs text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
