import { apiFetch } from "@/lib/api/client";

import type {
  NotificationItem,
  NotificationListData,
} from "@/lib/types/notification";

type NotificationListEnvelope = {
  data?: {
    items?: NotificationItem[];
    total?: number;
    limit?: number;
    offset?: number;
  };

  items?: NotificationItem[];
  total?: number;
  limit?: number;
  offset?: number;
};

type UnreadCountEnvelope = {
  data?: {
    unread_count?: number;
    count?: number;
  };

  unread_count?: number;
  count?: number;
};

export async function getNotifications(
  limit = 12,
  offset = 0,
): Promise<NotificationListData> {
  const response = await apiFetch<NotificationListEnvelope>(
    `/notifications?limit=${limit}&offset=${offset}`,
    {
      errorAlert: false,
    },
  );

  const data = response.data ?? response;

  return {
    items: Array.isArray(data.items) ? data.items : [],

    total: typeof data.total === "number" ? data.total : 0,

    limit: typeof data.limit === "number" ? data.limit : limit,

    offset: typeof data.offset === "number" ? data.offset : offset,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiFetch<UnreadCountEnvelope>(
    "/notifications/unread-count",
    {
      errorAlert: false,
    },
  );

  return (
    response.data?.unread_count ??
    response.data?.count ??
    response.unread_count ??
    response.count ??
    0
  );
}

export function markNotificationRead(notificationId: number) {
  return apiFetch<unknown>(`/notifications/${notificationId}/read`, {
    method: "PATCH",

    errorAlert: false,
  });
}

export function markAllNotificationsRead() {
  return apiFetch<unknown>("/notifications/read-all", {
    method: "PATCH",

    errorAlert: false,
  });
}
