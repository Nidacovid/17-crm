import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";

export function HoursText({
  minutes,
  className,
}: {
  minutes: number | null | undefined;
  className?: string;
}) {
  if (minutes === null || minutes === undefined) {
    return <span className={cn("num", className)}>—</span>;
  }
  return <span className={cn("num", className)}>{formatHours(minutes)}</span>;
}