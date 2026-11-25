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
      <CardContent className="flex items-start justify-between gap-2.5 p-4 sm:gap-3 sm:p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground sm:text-[13px]">{title}</p>
          <p className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {value}
          </p>
          {description && (
            <p className="truncate text-xs text-muted-foreground sm:text-[13px]">
              {description}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </CardContent>
    </Card>
  );
}
