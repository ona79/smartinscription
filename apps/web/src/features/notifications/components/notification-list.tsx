"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { notifyActionResult } from "@/hooks/use-action-toast";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  lu: boolean;
  createdAt: Date | string;
}

interface NotificationListProps {
  notifications: NotificationItem[];
}

/**
 * Liste des notifications récentes avec mise à jour optimiste et retour arrière
 * propre en cas d'échec. Pas de toast de succès redondant avec le compteur de cloche.
 */
export function NotificationList({ notifications: initialNotifications }: NotificationListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotifications);
  const [isPending, setIsPending] = useState(false);

  const unreadCount = items.filter((n) => !n.lu).length;

  async function handleMarkOne(id: string) {
    if (isPending) return;
    const previous = items;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
    setIsPending(true);

    try {
      const res = await markNotificationReadAction(id);
      if (!res.ok) {
        setItems(previous);
        notifyActionResult(res);
      } else {
        router.refresh();
      }
    } catch {
      setItems(previous);
      notifyActionResult({ ok: false, error: MESSAGES.generic.network });
    } finally {
      setIsPending(false);
    }
  }

  async function handleMarkAll() {
    if (isPending || unreadCount === 0) return;
    const previous = items;
    setItems((prev) => prev.map((n) => ({ ...n, lu: true })));
    setIsPending(true);

    try {
      const res = await markAllNotificationsReadAction();
      if (!res.ok) {
        setItems(previous);
        notifyActionResult(res);
      } else {
        router.refresh();
      }
    } catch {
      setItems(previous);
      notifyActionResult({ ok: false, error: MESSAGES.generic.network });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bell className="h-4 w-4 shrink-0 text-brand" />
          <CardTitle className="text-base font-semibold">Notifications</CardTitle>
          {unreadCount > 0 && (
            <Badge className="rounded-full bg-brand px-2 py-0.5 text-[11px] text-brand-foreground">
              {unreadCount}
            </Badge>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleMarkAll}
            className="rounded-lg text-xs"
          >
            Tout marquer lu
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
        {items.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-muted-foreground">
            Aucune notification pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {items.map((notif) => {
              const date =
                typeof notif.createdAt === "string"
                  ? new Date(notif.createdAt)
                  : notif.createdAt;
              return (
                <li
                  key={notif.id}
                  className={cn(
                    "flex items-start justify-between gap-2.5 py-2.5 sm:py-3",
                    !notif.lu && "font-medium"
                  )}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm text-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {date.toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "UTC",
                      })}
                    </p>
                  </div>

                  {!notif.lu && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={() => handleMarkOne(notif.id)}
                      aria-label="Marquer comme lu"
                      className="shrink-0 rounded-lg"
                    >
                      <Check className="h-4 w-4 text-brand" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
