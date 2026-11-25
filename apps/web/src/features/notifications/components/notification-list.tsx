import { Bell, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  lu: boolean;
  createdAt: Date;
}

interface NotificationListProps {
  notifications: NotificationItem[];
}

/** Liste des notifications récentes de l'utilisateur avec marquage lu. */
export function NotificationList({ notifications }: NotificationListProps) {
  const unreadCount = notifications.filter((n) => !n.lu).length;

  return (
    <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand" />
          <CardTitle className="text-base font-semibold">Notifications</CardTitle>
          {unreadCount > 0 && (
            <Badge className="rounded-full bg-brand px-2 py-0.5 text-[11px] text-brand-foreground">
              {unreadCount} nouvelle(s)
            </Badge>
          )}
        </div>

        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="ghost" size="sm" className="h-8 rounded-lg text-xs">
              Tout marquer lu
            </Button>
          </form>
        )}
      </CardHeader>

      <CardContent className="p-5 pt-0">
        {notifications.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-muted-foreground">
            Aucune notification pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className={cn(
                  "flex items-start justify-between gap-3 py-3",
                  !notif.lu && "font-medium"
                )}
              >
                <div className="space-y-1">
                  <p className="text-sm text-foreground">{notif.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {notif.createdAt.toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                {!notif.lu && (
                  <form action={markNotificationReadAction.bind(null, notif.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      aria-label="Marquer comme lu"
                      className="h-8 w-8 shrink-0 rounded-lg"
                    >
                      <Check className="h-4 w-4 text-brand" />
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
