"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/app-shell";
import { useLanguage } from "@/components/language-provider";
import TicketForm, {
  type TicketFormValues,
} from "@/features/tickets/components/ticket-form";
import { getTicket, updateTicket } from "@/features/tickets/api";
import { ApiError } from "@/lib/api/client";
import type { Ticket } from "@/lib/types/ticket";
export default function EditTicketPage() {
  const router = useRouter();
  const params = useParams<{
    id: string;
  }>();
  const { language, t } = useLanguage();
  const id = Number(params.id);
  const ui =
    language === "id"
      ? {
          back: "Kembali ke Detail Tiket",
          title: "Edit Tiket",
          subtitle: "Perbarui informasi dan detail tiket dukungan.",
          loading: "Memuat data tiket...",
          loadFailed: "Gagal mengambil data tiket.",
          updateFailed: "Gagal memperbarui tiket.",
        }
      : {
          back: "Back to Ticket Detail",
          title: "Edit Ticket",
          subtitle: "Update support ticket information and details.",
          loading: "Loading ticket data...",
          loadFailed: "Failed to load ticket data.",
          updateFailed: "Failed to update ticket.",
        };
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return;
    let active = true;
    void getTicket(id)
      .then((response) => {
        if (!active) return;
        setTicket(response.data);
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError) {
          if (err.status === 401) {
            router.replace("/login");
            return;
          }
          if (err.status === 403) {
            setError(t("errors.forbidden"));
            return;
          }
          if (err.status === 404) {
            setError(t("errors.ticketNotFound"));
            return;
          }
        }
        setError(ui.loadFailed);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, router, t, ui.loadFailed]);

  async function handleUpdate(values: TicketFormValues) {
    if (!ticket) {
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const response = await updateTicket(ticket.id, {
        category_id: values.category_id,
        subject: values.subject,
        description: values.description,
        priority: values.priority,
      });
      router.push(`/tickets/${response.data.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace("/login");
          return;
        }
        if (err.status === 403) {
          setError(t("errors.forbidden"));
          return;
        }
        if (err.status === 404) {
          setError(t("errors.ticketNotFound"));
          return;
        }
      }
      setError(ui.updateFailed);
    } finally {
      setSubmitting(false);
    }
  }
  if (!Number.isInteger(id) || id <= 0) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-semibold text-slate-950 dark:text-white">{t("detail.invalidID")}</p>
          <Link href="/tickets" className="inline-flex h-9 items-center rounded-md border border-slate-200 px-4 text-sm dark:border-slate-800">{t("detail.back")}</Link>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
          <LoaderCircle className="size-6 animate-spin text-slate-400" />
          <p className="text-[12px] font-medium text-slate-500">{ui.loading}</p>
        </div>
      </AppShell>
    );
  }
  if (!ticket) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-semibold text-slate-950 dark:text-white">
            {t("detail.unavailable")}
          </p>
          <p className="text-sm text-slate-500">{error}</p>
          <Link
            href="/tickets"
            className="inline-flex h-9 items-center rounded-md border border-slate-200 px-4 text-sm dark:border-slate-800"
          >
            {t("detail.back")}
          </Link>
        </div>
      </AppShell>
    );
  }
  const initialValues: TicketFormValues = {
    category_id: ticket.category_id,
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
  };
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-8">
        <Link
          href={`/tickets/${ticket.id}`}
          className="mb-5 inline-flex items-center gap-2 text-[12px] font-semibold text-slate-500 transition hover:text-slate-950 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" />
          {ui.back}
        </Link>
        <div className="mb-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            {ticket.ticket_number}
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.04em] text-slate-950 dark:text-white">
            {ui.title}
          </h1>
          <p className="mt-1 text-[12px] font-medium text-slate-500">
            {ui.subtitle}
          </p>
        </div>
        <TicketForm
          mode="edit"
          initialValues={initialValues}
          cancelHref={`/tickets/${ticket.id}`}
          submitting={submitting}
          serverError={error}
          onSubmit={handleUpdate}
        />
      </div>
    </AppShell>
  );
}
