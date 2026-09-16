import { formatEUR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MoneyText({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (value === null || value === undefined) {
    return <span className={cn("num", className)}>—</span>;
  }
  return <span className={cn("num", className)}>{formatEUR(value)}</span>;
}