import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  className?: string;
}

/** Carte de statistique compacte et sobre pour les tableaux de bord. */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("rounded-xl border border-border bg-surface py-0 shadow-xs", className)}>
      <CardContent className="flex items-center justify-between gap-2 p-3 sm:p-3.5">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
            {title}
          </p>
          <p className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {value}
          </p>
          {description && (
            <p className="truncate text-[11px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
