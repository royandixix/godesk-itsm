"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CirclePlus,
  Clock3,
  History,
  LoaderCircle,
  MessageSquareText,
  Pencil,
  RefreshCcw,
  Send,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  createTicketComment,
  getTicketActivity,
} from "@/features/tickets/activity-api";

import { ApiError } from "@/lib/api/client";

import type {
  TicketActivityType,
  TicketTimelineItem,
} from "@/lib/types/activity";

type TicketActivityCardProps = {
  ticketId: number;
  updatedAt?: string;
  language: "id" | "en";
  disabled?: boolean;
};

const ACTIVITY_ICONS: Partial<Record<TicketActivityType, LucideIcon>> = {
  COMMENT: MessageSquareText,
  TICKET_CREATED: CirclePlus,
  TICKET_UPDATED: Pencil,
  STATUS_CHANGED: RefreshCcw,
  AGENT_ASSIGNED: UserRoundCheck,
};

export default function TicketActivityCard({
  ticketId,
  updatedAt,
  language,
  disabled = false,
}: TicketActivityCardProps) {
  const [items, setItems] = useState<TicketTimelineItem[]>([]);

  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const ui =
    language === "id"
      ? {
          title: "Aktivitas & Komentar",

          description:
            "Riwayat perubahan tiket dan percakapan terkait tiket ini.",

          refresh: "Muat Ulang",

          commentLabel: "Tambahkan Komentar",

          placeholder: "Tulis komentar mengenai tiket ini...",

          send: "Kirim Komentar",

          sending: "Mengirim...",

          empty: "Belum ada aktivitas pada tiket ini.",

          loadFailed: "Riwayat aktivitas gagal dimuat.",

          commentRequired: "Komentar tidak boleh kosong.",

          commentFailed: "Komentar gagal dikirim.",

          system: "Sistem",

          activity: "Aktivitas",

          comment: "Komentar",
        }
      : {
          title: "Activity & Comments",

          description:
            "Ticket changes and conversations related to this ticket.",

          refresh: "Refresh",

          commentLabel: "Add Comment",

          placeholder: "Write a comment about this ticket...",

          send: "Send Comment",

          sending: "Sending...",

          empty: "There is no activity for this ticket yet.",

          loadFailed: "Failed to load ticket activity.",

          commentRequired: "Comment cannot be empty.",

          commentFailed: "Failed to send comment.",

          system: "System",

          activity: "Activity",

          comment: "Comment",
        };

  const loadActivity = useCallback(async () => {
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return;
    }

    try {
      setLoading(true);

      setError("");

      const response = await getTicketActivity(ticketId);

      setItems(response.data ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError(
          language === "id"
            ? "Riwayat aktivitas gagal dimuat."
            : "Failed to load ticket activity.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [ticketId, language]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadActivity();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadActivity, updatedAt]);

  async function handleSubmit() {
    const body = comment.trim();

    if (body === "" || sending || disabled) {
      if (body === "") {
        setError(ui.commentRequired);
      }

      return;
    }

    try {
      setSending(true);

      setError("");

      await createTicketComment(ticketId, {
        body,
      });

      setComment("");

      await loadActivity();
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError(ui.commentFailed);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#020617]">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <History className="size-4 text-slate-500" />

            <h3 className="text-sm font-semibold">{ui.title}</h3>
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {ui.description}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || sending || disabled}
          onClick={() => void loadActivity()}
        >
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}

          {ui.refresh}
        </Button>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-[280px] border-b border-slate-200 p-5 dark:border-slate-800 lg:border-b-0 lg:border-r">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <LoaderCircle className="size-5 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
                <History className="size-4 text-slate-500" />
              </div>

              <p className="max-w-[300px] text-xs leading-5 text-slate-500">
                {ui.empty}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {items.map((activity, index) => (
                <TimelineRow
                  key={`${activity.kind}-${activity.id}-${activity.created_at}`}
                  item={activity}
                  language={language}
                  systemLabel={ui.system}
                  activityLabel={ui.activity}
                  commentLabel={ui.comment}
                  last={index === items.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-slate-500" />

            <h4 className="text-sm font-semibold">{ui.commentLabel}</h4>
          </div>

          <Textarea
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);

              if (error === ui.commentRequired) {
                setError("");
              }
            }}
            disabled={sending || disabled}
            placeholder={ui.placeholder}
            className="mt-4 min-h-[130px] resize-y"
          />

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              disabled={sending || disabled || comment.trim() === ""}
              onClick={() => void handleSubmit()}
            >
              {sending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />

                  {ui.sending}
                </>
              ) : (
                <>
                  <Send className="size-4" />

                  {ui.send}
                </>
              )}
            </Button>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TimelineRow({
  item,
  language,
  systemLabel,
  activityLabel,
  commentLabel,
  last,
}: {
  item: TicketTimelineItem;
  language: "id" | "en";
  systemLabel: string;
  activityLabel: string;
  commentLabel: string;
  last: boolean;
}) {
  const Icon = ACTIVITY_ICONS[item.type] ?? History;

  const actor = item.actor_name?.trim() || systemLabel;

  const role = item.actor_role?.trim().replaceAll("_", " ") ?? "";

  return (
    <div className="relative flex gap-4">
      {!last ? (
        <div className="absolute left-[17px] top-9 h-[calc(100%-12px)] w-px bg-slate-200 dark:bg-slate-800" />
      ) : null}

      <div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
        <Icon className="size-4 text-slate-500" />
      </div>

      <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-6"}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {actor}
          </p>

          {role ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900">
              {role}
            </span>
          ) : null}

          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
            {item.kind === "COMMENT" ? commentLabel : activityLabel}
          </span>
        </div>

        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-600 dark:text-slate-300">
          {item.message}
        </p>

        {item.old_value || item.new_value ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-500">
            {item.old_value ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-900">
                {item.old_value}
              </span>
            ) : null}

            {item.old_value && item.new_value ? <span>→</span> : null}

            {item.new_value ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-900">
                {item.new_value}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
          <Clock3 className="size-3" />

          {formatDate(item.created_at, language)}
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string, language: "id" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",

    timeStyle: "short",
  }).format(date);
}
