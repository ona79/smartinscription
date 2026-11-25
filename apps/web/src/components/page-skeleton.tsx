import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  statsCount?: number;
  rowsCount?: number;
}

/** Squelette de page standard respectant l'échelle visuelle du design system. */
export function PageSkeleton({ statsCount = 3, rowsCount = 4 }: PageSkeletonProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {statsCount > 0 && (
        <div
          className={
            statsCount === 4
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              : statsCount === 2
                ? "grid gap-4 sm:grid-cols-2"
                : "grid gap-4 sm:grid-cols-3"
          }
        >
          {Array.from({ length: statsCount }).map((_, index) => (
            <Card
              key={index}
              className="rounded-xl border border-border bg-surface py-0 shadow-xs"
            >
              <CardContent className="space-y-2.5 p-5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3 p-5 pt-0">
          {Array.from({ length: rowsCount }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
