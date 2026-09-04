import { api } from "@/lib/http";
import type { NotificationItem, NotificationPageResult } from "@/types/notification";

export const notificationService = {
  getMyNotifications: (page = 0, size = 20) =>
    api.get<NotificationPageResult>("/v1/notifications/my", {
      page,
      size,
      _t: Date.now(),
    }),
  getNotificationById: (notificationId: number | string) =>
    api.get<NotificationItem>(`/v1/notifications/${notificationId}`),
  markAsRead: (notificationId: number) =>
    api.put<NotificationItem>(`/v1/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put<number>("/v1/notifications/read-all"),
  getUnreadCount: () => api.get<number>("/v1/notifications/my/unread-count"),
};
