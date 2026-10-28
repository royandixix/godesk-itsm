"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  CircleUserRound,
  Clock3,
  Folder,
  LoaderCircle,
  Mail,
  Pencil,
  RefreshCcw,
  Trash2,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import AppShell from "@/components/app-shell";

import { useLanguage } from "@/components/language-provider";

import { Button } from "@/components/ui/button";

import { getMe } from "@/features/auth/api";

import TicketSlaCard from "@/features/sla/components/ticket-sla-card";
import AgentAssignmentCard from "@/features/tickets/components/agent-assignment-card";

import TicketActivityCard from "@/features/tickets/components/ticket-activity-card";

import TicketAttachmentCard from "@/features/tickets/components/ticket-attachment-card";

import TicketCombobox, {
  type TicketComboboxOption,
} from "@/features/tickets/components/ticket-combobox";

import {
  PriorityIcon,
  StatusIcon,
} from "@/features/tickets/components/ticket-icons";

import {
  deleteTicket,
  getTicket,
  updateTicketStatus,
} from "@/features/tickets/api";

import { ApiError } from "@/lib/api/client";

import {
  closeAlert,
  confirmDeleteTicket,
  confirmUpdateStatus,
  showError,
  showLoading,
  showSuccess,
} from "@/lib/sweet-alert";

import type { User } from "@/lib/types/auth";

import type { Ticket, TicketPriority, TicketStatus } from "@/lib/types/ticket";

export default function TicketDetailPage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
  }>();

  const { language, t } = useLanguage();

  const id = Number(params.id);

  const [ticket, setTicket] = useState<Ticket | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  const [updating, setUpdating] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | "">("");

  const ui =
    language === "id"
      ? {
          edit: "Edit Tiket",

          refresh: "Muat Ulang",

          update: "Perbarui Status",

          updating: "Memperbarui...",

          statusPlaceholder: "Cari atau pilih status...",

          statusEmpty: "Status tidak ditemukan.",

          delete: "Hapus Tiket",

          deleting: "Menghapus...",

          statusRestricted:
            "Status tiket hanya dapat diperbarui oleh Super Admin, Manager, atau Agent yang ditugaskan.",

          statusLoadingTitle: "Memperbarui Status",

          statusLoadingText:
            "Mohon tunggu. Status tiket sedang diperbarui pada sistem GoDesk.",

          statusSuccessTitle: "Status Berhasil Diperbarui",

          statusFailedTitle: "Gagal Memperbarui Status",

          statusFailed: "Status tiket gagal diperbarui. Silakan coba kembali.",

          deleteLoadingTitle: "Menghapus Tiket",

          deleteLoadingText:
            "Mohon tunggu. Tiket sedang dihapus dari sistem GoDesk.",

          deleteSuccessTitle: "Tiket Berhasil Dihapus",

          deleteSuccess:
            "Tiket berhasil dihapus secara permanen dari sistem GoDesk.",

          deleteFailedTitle: "Gagal Menghapus Tiket",

          deleteFailed: "Tiket gagal dihapus. Silakan coba kembali.",

          forbiddenTitle: "Akses Ditolak",

          notFoundTitle: "Tiket Tidak Ditemukan",
        }
      : {
          edit: "Edit Ticket",

          refresh: "Refresh",

          update: "Update Status",

          updating: "Updating...",

          statusPlaceholder: "Search or select status...",

          statusEmpty: "No status found.",

          delete: "Delete Ticket",

          deleting: "Deleting...",

          statusRestricted:
            "Ticket status can only be updated by a Super Admin, Manager, or assigned Agent.",

          statusLoadingTitle: "Updating Status",

          statusLoadingText:
            "Please wait. The ticket status is being updated in GoDesk.",

          statusSuccessTitle: "Status Updated Successfully",

          statusFailedTitle: "Failed to Update Status",

          statusFailed:
            "The ticket status could not be updated. Please try again.",

          deleteLoadingTitle: "Deleting Ticket",

          deleteLoadingText:
            "Please wait. The ticket is being removed from GoDesk.",

          deleteSuccessTitle: "Ticket Deleted Successfully",

          deleteSuccess: "The ticket has been permanently removed from GoDesk.",

          deleteFailedTitle: "Failed to Delete Ticket",

          deleteFailed: "The ticket could not be deleted. Please try again.",

          forbiddenTitle: "Access Denied",

          notFoundTitle: "Ticket Not Found",
        };

  const loadTicket = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setTicket(null);

      setError(t("detail.invalidID"));

      setLoading(false);

      return;
    }

    try {
      setLoading(true);

      setError("");

      const [ticketResponse, userResponse] = await Promise.all([
        getTicket(id),
        getMe(),
      ]);

      setTicket(ticketResponse.data);

      setCurrentUser(userResponse.data);

      setSelectedStatus(ticketResponse.data.status);
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

        setError(err.message);

        return;
      }

      setError(t("detail.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [id, router, t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTicket();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadTicket]);

  const statusOptions = useMemo<TicketComboboxOption[]>(
    () =>
      (["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as TicketStatus[]).map(
        (value) => ({
          value,

          label: t(`status.${value}`),

          icon: <StatusIcon status={value} />,
        }),
      ),
    [t],
  );

  const canEdit = Boolean(
    currentUser &&
    ticket &&
    (currentUser.role === "SUPER_ADMIN" ||
      (currentUser.role === "CUSTOMER" &&
        currentUser.id === ticket.customer_id &&
        ticket.status === "OPEN")),
  );

  const canUpdateStatus = Boolean(
    currentUser &&
    ticket &&
    (currentUser.role === "SUPER_ADMIN" ||
      currentUser.role === "MANAGER" ||
      (currentUser.role === "AGENT" &&
        ticket.assigned_agent_id === currentUser.id)),
  );

  const canDelete = Boolean(
    currentUser &&
    (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MANAGER"),
  );

  const canAssign = Boolean(
    currentUser &&
    (currentUser.role === "SUPER_ADMIN" || currentUser.role === "MANAGER"),
  );

  async function handleStatus() {
    if (
      !ticket ||
      !selectedStatus ||
      !canUpdateStatus ||
      updating ||
      deleting ||
      selectedStatus === ticket.status
    ) {
      return;
    }

    const oldStatus = ticket.status;

    const newStatus = selectedStatus;

    const confirmed = await confirmUpdateStatus({
      ticketNumber: ticket.ticket_number,

      oldStatus,

      newStatus,

      language: language === "id" ? "id" : "en",
    });

    if (!confirmed) {
      return;
    }

    try {
      setUpdating(true);

      setError("");

      void showLoading(
        ui.statusLoadingTitle,
        `${ui.statusLoadingText} ${ticket.ticket_number}`,
      );

      const response = await updateTicketStatus(ticket.id, {
        status: newStatus,
      });

      closeAlert();

      setTicket(response.data);

      setSelectedStatus(response.data.status);

      const translatedStatus = t(`status.${response.data.status}`);

      await showSuccess(
        language === "id"
          ? `Status tiket ${response.data.ticket_number} berhasil diperbarui dari ${t(
              `status.${oldStatus}`,
            )} menjadi ${translatedStatus}. Perubahan sudah tersimpan dan langsung aktif pada sistem GoDesk.`
          : `Ticket ${response.data.ticket_number} was successfully updated from ${t(
              `status.${oldStatus}`,
            )} to ${translatedStatus}. The change has been saved and is now active in GoDesk.`,

        ui.statusSuccessTitle,
      );
    } catch (err) {
      closeAlert();

      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace("/login");

          return;
        }

        if (err.status === 403) {
          const message = t("errors.forbidden");

          setError(message);

          await showError(message, ui.forbiddenTitle);

          return;
        }

        if (err.status === 404) {
          const message = t("errors.ticketNotFound");

          setError(message);

          await showError(message, ui.notFoundTitle);

          return;
        }

        setError(err.message);

        await showError(err.message, ui.statusFailedTitle);

        return;
      }

      setError(ui.statusFailed);

      await showError(ui.statusFailed, ui.statusFailedTitle);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!ticket || !canDelete || deleting || updating) {
      return;
    }

    const confirmed = await confirmDeleteTicket({
      ticketNumber: ticket.ticket_number,

      subject: ticket.subject,

      language: language === "id" ? "id" : "en",
    });

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      setError("");

      void showLoading(
        ui.deleteLoadingTitle,
        `${ui.deleteLoadingText} ${ticket.ticket_number}`,
      );

      await deleteTicket(ticket.id);

      closeAlert();

      await showSuccess(
        language === "id"
          ? `${ui.deleteSuccess} Nomor tiket ${ticket.ticket_number} tidak akan muncul lagi pada daftar tiket.`
          : `${ui.deleteSuccess} Ticket ${ticket.ticket_number} will no longer appear in the ticket list.`,

        ui.deleteSuccessTitle,
      );

      router.replace("/tickets");

      router.refresh();
    } catch (err) {
      closeAlert();

      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace("/login");

          return;
        }

        if (err.status === 403) {
          const message = t("errors.forbidden");

          setError(message);

          await showError(message, ui.forbiddenTitle);

          return;
        }

        if (err.status === 404) {
          const message = t("errors.ticketNotFound");

          setError(message);

          await showError(message, ui.notFoundTitle);

          return;
        }

        setError(err.message || ui.deleteFailed);

        await showError(err.message || ui.deleteFailed, ui.deleteFailedTitle);

        return;
      }

      setError(ui.deleteFailed);

      await showError(ui.deleteFailed, ui.deleteFailedTitle);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
          <LoaderCircle className="size-6 animate-spin text-slate-400" />

          <p className="text-[12px] text-slate-500">{t("common.loading")}</p>
        </div>
      </AppShell>
    );
  }

  if (!ticket) {
    return (
      <AppShell>
        <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-semibold">{t("detail.unavailable")}</p>

          <p className="text-sm text-slate-500">{error}</p>

          <Link
            href="/tickets"
            className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm"
          >
            <ArrowLeft className="size-4" />

            {t("detail.back")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const categoryKey = `category.${ticket.category_slug}`;

  const translatedCategory = t(categoryKey);

  const category =
    translatedCategory === categoryKey
      ? ticket.category_name
      : translatedCategory;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/tickets"
              className="mb-3 inline-flex items-center gap-2 text-[12px] font-semibold text-slate-500 transition hover:text-slate-950 dark:hover:text-white"
            >
              <ArrowLeft className="size-4" />

              {t("detail.back")}
            </Link>

            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
              {ticket.ticket_number}
            </p>

            <h1 className="mt-1 text-[26px] font-bold tracking-[-0.04em]">
              {t("detail.title")}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <Link
                href={`/tickets/${ticket.id}/edit`}
                className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#020617] dark:hover:bg-slate-900"
              >
                <Pencil className="size-3.5" />

                {ui.edit}
              </Link>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleting || updating}
              onClick={() => void loadTicket()}
            >
              <RefreshCcw className="size-4" />

              {ui.refresh}
            </Button>

            {canDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleting || updating}
                className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-900/70 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                onClick={() => void handleDelete()}
              >
                {deleting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />

                    {ui.deleting}
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />

                    {ui.delete}
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#020617]">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  status={ticket.status}
                  label={t(`status.${ticket.status}`)}
                />

                <PriorityBadge
                  priority={ticket.priority}
                  label={t(`priority.${ticket.priority}`)}
                />
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.025em]">
                {ticket.subject}
              </h2>
            </div>

            <div className="p-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
                {ticket.description}
              </p>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#020617]">
              <h3 className="text-sm font-semibold">
                {t("detail.information")}
              </h3>

              <div className="mt-5 space-y-4">
                <InfoRow
                  icon={CircleUserRound}
                  title={t("detail.customer")}
                  value={ticket.customer_name}
                />

                <InfoRow
                  icon={Mail}
                  title={t("detail.email")}
                  value={ticket.customer_email}
                />

                <InfoRow
                  icon={Folder}
                  title={t("detail.category")}
                  value={category}
                />

                <InfoRow
                  icon={CircleUserRound}
                  title={t("detail.assignedAgent")}
                  value={ticket.assigned_agent_name ?? t("detail.notAssigned")}
                />

                <InfoRow
                  icon={CalendarDays}
                  title={t("detail.created")}
                  value={formatDate(ticket.created_at, language)}
                />

                <InfoRow
                  icon={Clock3}
                  title={t("detail.updated")}
                  value={formatDate(ticket.updated_at, language)}
                />
              </div>
            </section>

            <AgentAssignmentCard
              ticket={ticket}
              canAssign={canAssign}
              disabled={updating || deleting}
              language={language === "id" ? "id" : "en"}
              onAssigned={(updatedTicket) => {
                setTicket(updatedTicket);

                setSelectedStatus(updatedTicket.status);

                setError("");
              }}
            />

            {canUpdateStatus ? (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#020617]">
                <h3 className="text-sm font-semibold">
                  {t("detail.updateStatus")}
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {t("detail.statusHelp")}
                </p>

                <div className="mt-4 space-y-3">
                  <TicketCombobox
                    value={selectedStatus}
                    onValueChange={(value) => {
                      if (value) {
                        setSelectedStatus(value as TicketStatus);
                      }
                    }}
                    options={statusOptions}
                    placeholder={ui.statusPlaceholder}
                    emptyText={ui.statusEmpty}
                    disabled={updating || deleting}
                  />

                  <Button
                    type="button"
                    className="w-full"
                    disabled={
                      updating ||
                      deleting ||
                      !selectedStatus ||
                      selectedStatus === ticket.status
                    }
                    onClick={() => void handleStatus()}
                  >
                    {updating ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />

                        {ui.updating}
                      </>
                    ) : (
                      ui.update
                    )}
                  </Button>
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#020617]">
                <h3 className="text-sm font-semibold">
                  {t("detail.updateStatus")}
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {ui.statusRestricted}
                </p>
              </section>
            )}
          </aside>
        </div>

        {/* STAGE 9 — SLA MANAGEMENT */}
        <TicketSlaCard
          ticketId={ticket.id}
          updatedAt={ticket.updated_at}
          language={language === "id" ? "id" : "en"}
        />

        <TicketAttachmentCard
          ticketId={ticket.id}
          currentUser={currentUser}
          language={language === "id" ? "id" : "en"}
          disabled={updating || deleting}
        />

        <TicketActivityCard
          ticketId={ticket.id}
          updatedAt={ticket.updated_at}
          language={language === "id" ? "id" : "en"}
          disabled={updating || deleting}
        />
      </div>
    </AppShell>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: TicketStatus;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-900">
      <StatusIcon status={status} className="size-3.5" />

      {label}
    </span>
  );
}

function PriorityBadge({
  priority,
  label,
}: {
  priority: TicketPriority;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-900">
      <PriorityIcon priority={priority} className="size-3.5" />

      {label}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  title,
  value,
}: {
  icon: ComponentType<{
    className?: string;
  }>;

  title: string;

  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900">
        <Icon className="size-4 text-slate-500" />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {title}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatDate(value: string, language: "en" | "id") {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",

    timeStyle: "short",
  }).format(new Date(value));
}
