import { Badge } from "@/components/ui/badge";

interface UnreadBadgeProps {
  count: number;
}

/** Pastille réutilisable affichant le nombre de notifications non lues. */
export function UnreadNotificationsBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) return null;

  return (
    <Badge className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-foreground">
      {count} non lue{count > 1 ? "s" : ""}
    </Badge>
  );
}
