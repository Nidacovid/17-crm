import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueCard } from "@/components/home/RevenueCard";
import { ActiveProjectsCard } from "@/components/home/ActiveProjectsCard";
import { CalendarCard } from "@/components/home/CalendarCard";
import { TodayCard } from "@/components/home/TodayCard";
import {
  getActiveProjects,
  getHomeCalendar,
  getHomeRevenue,
  getTodayPanel,
} from "@/lib/queries/home";
import { cn } from "@/lib/utils";

function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("w-full rounded-lg", className)} />;
}

// 8.1: rejilla 2 × 2 en escritorio (fila superior 1fr 1fr, inferior 1.4fr 1fr)
// y una columna en el mismo orden en móvil. Las cuatro consultas se lanzan en
// paralelo y cada tarjeta tiene su propio Suspense (8.6).
export default function HomePage() {
  const revenue = getHomeRevenue();
  const projects = getActiveProjects();
  const calendar = getHomeCalendar();
  const today = getTodayPanel();

  return (
    <>
      <PageHeader title="Home" />
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Suspense fallback={<CardSkeleton className="h-44" />}>
            <RevenueCard data={revenue} />
          </Suspense>
          <Suspense fallback={<CardSkeleton className="h-44" />}>
            <ActiveProjectsCard data={projects} />
          </Suspense>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Suspense fallback={<CardSkeleton className="h-80" />}>
            <CalendarCard data={calendar} />
          </Suspense>
          <Suspense fallback={<CardSkeleton className="h-80" />}>
            <TodayCard data={today} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
