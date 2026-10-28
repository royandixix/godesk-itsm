export type NotificationType =
  | "AGENT_ASSIGNED"
  | "STATUS_CHANGED"
  | "COMMENT_ADDED"
  | "SYSTEM";

export interface NotificationItem {
  id: number;

  recipient_user_id: number;

  actor_user_id: number | null;

  actor_name: string | null;

  ticket_id: number | null;

  ticket_number: string | null;

  type: NotificationType;

  title: string;

  message: string;

  is_read: boolean;

  read_at: string | null;

  created_at: string;
}

export interface NotificationListData {
  items: NotificationItem[];

  total: number;

  limit: number;

  offset: number;
}

export interface NotificationListResponse {
  data: NotificationListData;
}

export interface NotificationUnreadData {
  unread_count: number;
}

export interface NotificationUnreadResponse {
  data: NotificationUnreadData;
}