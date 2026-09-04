import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/http";
import { notificationService } from "@/services/notification.service";
import { mergeById } from "@/lib/utils";
import type { NotificationItem } from "@/types/notification";

const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const sortByNewest = (items: NotificationItem[]) => mergeById([], items);

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
  const { notificationId } = useParams<{ notificationId?: string }>();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [activeModalNotification, setActiveModalNotification] = useState<NotificationItem | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

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

  // Load single notification when route /notifications/:notificationId is present
  useEffect(() => {
    if (!notificationId) {
      setActiveModalNotification(null);
      return;
    }

    const id = Number(notificationId);
    if (Number.isNaN(id)) {
      navigate("/notifications", { replace: true });
      return;
    }

    // Check if already present in state
    const existing = notifications.find((item) => item.id === id);
    if (existing) {
      setActiveModalNotification(existing);
      if (!existing.isRead) {
        void markNotificationRead(existing.id);
      }
      return;
    }

    // Otherwise fetch detail from backend API
    const fetchDetail = async () => {
      setIsModalLoading(true);
      try {
        const response = await notificationService.getNotificationById(id);
        const item = response.data;
        setActiveModalNotification(item);
        setNotifications((prev) => mergeById(prev, [item]));
      } catch (error) {
        toast.error(getApiErrorMessage(error));
        navigate("/notifications", { replace: true });
      } finally {
        setIsModalLoading(false);
      }
    };

    void fetchDetail();
  }, [notificationId, notifications, navigate]);

  useEffect(() => {
    void loadNotifications(true);

    const handleNotificationCreated = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationItem>;
      const newItem = customEvent.detail;
      setNotifications((prev) => mergeById(prev, [newItem]));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications(false);
      }
    };

    const onWindowFocus = () => {
      void loadNotifications(false);
    };

    window.addEventListener("notificationCreated", handleNotificationCreated);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      window.removeEventListener("notificationCreated", handleNotificationCreated);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, []);

  const markNotificationRead = async (id: number) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
    setActiveModalNotification((prev) => (prev && prev.id === id ? { ...prev, isRead: true } : prev));
  };

  const handleMarkAsRead = async (id: number) => {
    setIsMutating(true);
    try {
      await markNotificationRead(id);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    navigate(`/notifications/${item.id}`);
  };

  const handleCloseModal = () => {
    setActiveModalNotification(null);
    navigate("/notifications");
  };

  const handleActionClick = async () => {
    if (!activeModalNotification?.linkAction) {
      return;
    }

    const path = activeModalNotification.linkAction;
    if (!isInternalAppPath(path)) {
      toast.error("Unsupported notification link");
      return;
    }

    if (!activeModalNotification.isRead) {
      await markNotificationRead(activeModalNotification.id);
    }

    setActiveModalNotification(null);
    navigate(path);
  };

  const handleMarkAllAsRead = async () => {
    setIsMutating(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      if (activeModalNotification) {
        setActiveModalNotification({ ...activeModalNotification, isRead: true });
      }
      toast.success(t("notifications.mark_all_success"));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("notifications.title")}</h1>
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
                  role="button"
                  tabIndex={0}
                  onClick={() => handleItemClick(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleItemClick(item);
                    }
                  }}
                  className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                    item.isRead ? "bg-card" : "bg-accent/30 font-medium"
                  } hover:border-primary/50 hover:bg-accent/20`}
                >
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
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

                  {item.message && <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>}

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <Badge variant="outline">{item.type}</Badge>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Modal */}
      <Dialog open={Boolean(notificationId || activeModalNotification)} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-md">
          {isModalLoading ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Đang tải chi tiết thông báo...
            </div>
          ) : activeModalNotification ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{activeModalNotification.type}</Badge>
                  {activeModalNotification.isRead ? (
                    <span className="text-xs text-muted-foreground">Đã đọc</span>
                  ) : (
                    <Badge variant="default">Mới</Badge>
                  )}
                </div>
                <DialogTitle className="mt-2 text-xl font-bold">{activeModalNotification.title}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {new Date(activeModalNotification.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="my-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {activeModalNotification.message}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {activeModalNotification.linkAction && (
                  <Button type="button" className="gap-2" onClick={() => void handleActionClick()}>
                    <ExternalLink className="h-4 w-4" />
                    Chuyển tới công việc / dự án
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
