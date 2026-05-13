import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/http";
import { notificationService } from "@/services/notification.service";
import type { NotificationItem } from "@/types/notification";

const POLL_INTERVAL_MS = 5000;
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function sortByNewest(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeById(prev: NotificationItem[], incoming: NotificationItem[]): NotificationItem[] {
  const map = new Map<number, NotificationItem>();

  for (const item of prev) {
    map.set(item.id, item);
  }

  for (const item of incoming) {
    map.set(item.id, item);
  }

  return sortByNewest(Array.from(map.values()));
}

function isInternalAppPath(linkAction: string | null): linkAction is string {
  return Boolean(
    linkAction &&
      linkAction.startsWith("/") &&
      !linkAction.startsWith("//") &&
      !URL_SCHEME_PATTERN.test(linkAction),
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const latestRequestIdRef = useRef(0);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const loadNotifications = async (showLoading = true) => {
    const requestId = ++latestRequestIdRef.current;

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await notificationService.getMyNotifications(0, 50);
      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      const incoming = response.data.content ?? [];
      setNotifications((prev) => (showLoading ? sortByNewest(incoming) : mergeById(prev, incoming)));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      if (showLoading && requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadNotifications(true);

    const intervalId = window.setInterval(() => {
      void loadNotifications(false);
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications(false);
      }
    };

    const onWindowFocus = () => {
      void loadNotifications(false);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, []);

  const markNotificationRead = async (notificationId: number) => {
    await notificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
    );
  };

  const handleMarkAsRead = async (notificationId: number) => {
    setIsMutating(true);
    try {
      await markNotificationRead(notificationId);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleOpenNotification = async (item: NotificationItem) => {
    if (!item.linkAction) {
      return;
    }

    if (!isInternalAppPath(item.linkAction)) {
      toast.error("Unsupported notification link");
      return;
    }

    setIsMutating(true);
    try {
      if (!item.isRead) {
        await markNotificationRead(item.id);
      }
      navigate(item.linkAction);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMutating(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      toast.success(t("notifications.mark_all_success"));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("notifications.title")}</h1>
          <p className="text-muted-foreground">{t("notifications.desc")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => void handleMarkAllAsRead()}
          disabled={isMutating || unreadCount === 0}
        >
          <CheckCheck className="h-4 w-4" />
          {t("notifications.mark_all")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("notifications.inbox_title")}</CardTitle>
          <CardDescription>
            {t("notifications.unread_count", { count: unreadCount })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("notifications.loading")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              {t("notifications.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  role={item.linkAction ? "button" : undefined}
                  tabIndex={item.linkAction ? 0 : undefined}
                  onClick={() => void handleOpenNotification(item)}
                  onKeyDown={(event) => {
                    if (!item.linkAction) {
                      return;
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void handleOpenNotification(item);
                    }
                  }}
                  className={`rounded-lg border p-4 transition-colors ${
                    item.isRead ? "bg-card" : "bg-accent/30"
                  } ${item.linkAction ? "cursor-pointer hover:border-primary/50 hover:bg-accent/20" : ""}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{item.title}</h3>
                      {!item.isRead && <Badge>{t("notifications.new_badge")}</Badge>}
                    </div>
                    {!item.isRead && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleMarkAsRead(item.id);
                        }}
                        disabled={isMutating}
                      >
                        {t("notifications.mark_read")}
                      </Button>
                    )}
                  </div>

                  {item.message && <p className="text-sm text-muted-foreground">{item.message}</p>}

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.type}</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
