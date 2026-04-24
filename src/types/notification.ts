export type NotificationType = "SYSTEM" | "ASSIGNED" | "DEADLINE_NEAR";

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string | null;
  type: NotificationType;
  isRead: boolean;
  linkAction: string | null;
  createdAt: string;
}

export interface NotificationPageResult {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
