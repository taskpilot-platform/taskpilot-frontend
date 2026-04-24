import { http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type { NotificationItem, NotificationPageResult } from "@/types/notification";

export const notificationService = {
  async getMyNotifications(page = 0, size = 20): Promise<ApiResponse<NotificationPageResult>> {
    const response = await http.get<ApiResponse<NotificationPageResult>>("/v1/notifications/my", {
      // Add a cache buster to avoid stale GET responses from intermediary caches.
      params: { page, size, _t: Date.now() },
    });
    return response.data;
  },

  async markAsRead(notificationId: number): Promise<ApiResponse<NotificationItem>> {
    const response = await http.put<ApiResponse<NotificationItem>>(`/v1/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<ApiResponse<number>> {
    const response = await http.put<ApiResponse<number>>("/v1/notifications/read-all");
    return response.data;
  },

  async getUnreadCount(): Promise<ApiResponse<number>> {
    const response = await http.get<ApiResponse<number>>("/v1/notifications/my/unread-count");
    return response.data;
  },
};
