"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  RefreshCw,
  TicketCheck,
  UserRoundCheck,
} from "lucide-react";

import { AnimatePresence, motion } from "motion/react";

import { useLanguage } from "@/components/language-provider";

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/notification-api";

import type {
  NotificationItem,
  NotificationType,
} from "@/lib/types/notification";

type NotificationBellProps = {
  isDark: boolean;
};

const NOTIFICATION_LIMIT = 12;

export function NotificationBell({ isDark }: NotificationBellProps) {
  const router = useRouter();

  const { language } = useLanguage();

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [total, setTotal] = useState(0);

  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [markingAll, setMarkingAll] = useState(false);

  const [error, setError] = useState("");

  const copy =
    language === "id"
      ? {
          notifications: "Notifikasi",
          markAll: "Tandai semua dibaca",
          refresh: "Muat ulang",
          loading: "Memuat notifikasi...",
          empty: "Belum ada notifikasi.",
          emptyDescription: "Notifikasi aktivitas tiket akan muncul di sini.",
          error: "Gagal memuat notifikasi.",
          markRead: "Tandai sudah dibaca",
          unread: "belum dibaca",
          openTicket: "Buka tiket",
          showing: "Ditampilkan",
        }
      : {
          notifications: "Notifications",
          markAll: "Mark all as read",
          refresh: "Refresh",
          loading: "Loading notifications...",
          empty: "No notifications yet.",
          emptyDescription: "Ticket activity notifications will appear here.",
          error: "Failed to load notifications.",
          markRead: "Mark as read",
          unread: "unread",
          openTicket: "Open ticket",
          showing: "Showing",
        };

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();

      setUnreadCount(count);
    } catch {
      /*
       * Badge tidak perlu menampilkan
       * error global apabila refresh
       * background gagal.
       */
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setError("");

      const result = await getNotifications(NOTIFICATION_LIMIT, 0);

      setNotifications(result.items);

      setTotal(result.total);
    } catch {
      setError(copy.error);
    }
  }, [copy.error]);

  useEffect(() => {
    let active = true;
    const poll = () => {
      void getUnreadNotificationCount().then((count) => {
        if (active) setUnreadCount(count);
      }).catch(() => {});
    };

    poll();
    const interval = window.setInterval(poll, 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);

      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleToggle() {
    const nextOpen = !open;

    setOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    try {
      setLoading(true);

      await Promise.all([loadNotifications(), refreshUnreadCount()]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    try {
      setRefreshing(true);

      await Promise.all([loadNotifications(), refreshUnreadCount()]);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleMarkRead(item: NotificationItem) {
    if (item.is_read) {
      return;
    }

    try {
      setError("");

      await markNotificationRead(item.id);

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? {
                ...notification,

                is_read: true,
              }
            : notification,
        ),
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      setError(
        language === "id"
          ? "Gagal menandai notifikasi."
          : "Failed to mark notification as read.",
      );
    }
  }

  async function handleMarkAll() {
    if (markingAll || unreadCount === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      setError("");

      await markAllNotificationsRead();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,

          is_read: true,
        })),
      );

      setUnreadCount(0);
    } catch {
      setError(
        language === "id"
          ? "Gagal menandai semua notifikasi."
          : "Failed to mark all notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleOpenNotification(item: NotificationItem) {
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);

        setNotifications((current) =>
          current.map((notification) =>
            notification.id === item.id
              ? {
                  ...notification,

                  is_read: true,
                }
              : notification,
          ),
        );

        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        /*
         * Kegagalan mark-read tidak
         * menghalangi user membuka tiket.
         */
      }
    }

    setOpen(false);

    if (item.ticket_id) {
      router.push(`/tickets/${item.ticket_id}`);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => void handleToggle()}
        aria-label={copy.notifications}
        title={copy.notifications}
        className={`relative flex size-9 items-center justify-center rounded-lg transition ${
          open
            ? isDark
              ? "bg-slate-800 text-white"
              : "bg-slate-100 text-slate-950"
            : isDark
              ? "text-slate-400 hover:bg-slate-900 hover:text-white"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
        }`}
      >
        <Bell className="size-[17px]" strokeWidth={1.9} />

        {unreadCount > 0 && (
          <motion.span
            initial={{
              scale: 0,
            }}
            animate={{
              scale: 1,
            }}
            className="absolute -right-1 -top-1 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#020617]"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,

              y: -8,

              scale: 0.98,
            }}
            animate={{
              opacity: 1,

              y: 0,

              scale: 1,
            }}
            exit={{
              opacity: 0,

              y: -8,

              scale: 0.98,
            }}
            transition={{
              duration: 0.16,
            }}
            className={`absolute right-0 top-[44px] z-[60] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-2xl ${
              isDark
                ? "border-slate-800 bg-[#0b1120] shadow-black/40"
                : "border-slate-200 bg-white shadow-slate-950/10"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b px-4 py-3 ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className={`text-[13px] font-bold ${
                      isDark ? "text-white" : "text-slate-950"
                    }`}
                  >
                    {copy.notifications}
                  </h2>

                  {unreadCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isDark
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {unreadCount} {copy.unread}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    disabled={markingAll}
                    onClick={() => void handleMarkAll()}
                    title={copy.markAll}
                    className={`flex size-8 items-center justify-center rounded-lg transition disabled:opacity-50 ${
                      isDark
                        ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    {markingAll ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCheck className="size-4" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() => void handleRefresh()}
                  title={copy.refresh}
                  className={`flex size-8 items-center justify-center rounded-lg transition disabled:opacity-50 ${
                    isDark
                      ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <RefreshCw
                    className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            {error && (
              <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2.5 text-[11px] font-medium text-red-500">
                {error}
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center px-6">
                  <Loader2 className="size-5 animate-spin text-slate-500" />

                  <p className="mt-3 text-[11px] font-medium text-slate-500">
                    {copy.loading}
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex min-h-[190px] flex-col items-center justify-center px-8 text-center">
                  <div
                    className={`flex size-10 items-center justify-center rounded-full ${
                      isDark ? "bg-slate-900" : "bg-slate-100"
                    }`}
                  >
                    <Bell className="size-[18px] text-slate-500" />
                  </div>

                  <p
                    className={`mt-3 text-[12px] font-semibold ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {copy.empty}
                  </p>

                  <p className="mt-1 max-w-[240px] text-[10px] leading-4 text-slate-500">
                    {copy.emptyDescription}
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleOpenNotification(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();

                        void handleOpenNotification(item);
                      }
                    }}
                    className={`group relative cursor-pointer border-b px-4 py-3.5 outline-none transition last:border-b-0 ${
                      isDark
                        ? "border-slate-800/80 hover:bg-slate-900"
                        : "border-slate-100 hover:bg-slate-50"
                    } ${
                      !item.is_read
                        ? isDark
                          ? "bg-slate-900/55"
                          : "bg-slate-50/80"
                        : ""
                    }`}
                  >
                    {!item.is_read && (
                      <span className="absolute left-1.5 top-5 size-1.5 rounded-full bg-blue-500" />
                    )}

                    <div className="flex gap-3">
                      <NotificationTypeIcon type={item.type} isDark={isDark} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-[11px] ${
                                item.is_read
                                  ? "font-medium text-slate-500"
                                  : isDark
                                    ? "font-bold text-slate-100"
                                    : "font-bold text-slate-900"
                              }`}
                            >
                              {item.title}
                            </p>

                            <p
                              className={`mt-1 text-[10px] leading-[16px] ${
                                item.is_read
                                  ? "text-slate-500"
                                  : isDark
                                    ? "text-slate-300"
                                    : "text-slate-600"
                              }`}
                            >
                              {item.message}
                            </p>
                          </div>

                          {!item.is_read && (
                            <button
                              type="button"
                              title={copy.markRead}
                              aria-label={copy.markRead}
                              onClick={(event) => {
                                event.stopPropagation();

                                void handleMarkRead(item);
                              }}
                              className={`flex size-7 shrink-0 items-center justify-center rounded-lg opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${
                                isDark
                                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                                  : "text-slate-500 hover:bg-slate-200 hover:text-slate-950"
                              }`}
                            >
                              <Check className="size-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {item.ticket_number && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                                isDark
                                  ? "bg-slate-800 text-slate-400"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {item.ticket_number}
                            </span>
                          )}

                          <span className="text-[9px] text-slate-500">
                            {formatNotificationTime(item.created_at, language)}
                          </span>

                          {item.actor_name && (
                            <>
                              <span className="text-[9px] text-slate-700 dark:text-slate-600">
                                •
                              </span>

                              <span className="truncate text-[9px] text-slate-500">
                                {item.actor_name}
                              </span>
                            </>
                          )}
                        </div>

                        {item.ticket_id && (
                          <p className="mt-2 text-[9px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">
                            {copy.openTicket} →
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {!loading && notifications.length > 0 && (
              <div
                className={`border-t px-4 py-2.5 text-center text-[9px] font-medium text-slate-500 ${
                  isDark
                    ? "border-slate-800 bg-[#080e1a]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                {copy.showing} {notifications.length} / {total}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationTypeIcon({
  type,
  isDark,
}: {
  type: NotificationType;
  isDark: boolean;
}) {
  const containerClass = `flex size-9 shrink-0 items-center justify-center rounded-lg ${
    isDark ? "bg-slate-800" : "bg-slate-100"
  }`;

  switch (type) {
    case "AGENT_ASSIGNED":
      return (
        <div className={containerClass}>
          <UserRoundCheck className="size-4 text-blue-500" />
        </div>
      );

    case "STATUS_CHANGED":
      return (
        <div className={containerClass}>
          <TicketCheck className="size-4 text-emerald-500" />
        </div>
      );

    case "COMMENT_ADDED":
      return (
        <div className={containerClass}>
          <MessageSquare className="size-4 text-violet-500" />
        </div>
      );

    default:
      return (
        <div className={containerClass}>
          <Bell className="size-4 text-slate-500" />
        </div>
      );
  }
}

function formatNotificationTime(value: string, language: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",

    timeStyle: "short",
  }).format(date);
}
