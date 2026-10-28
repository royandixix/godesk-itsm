"use client";

import Link from "next/link";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FilterX,
  Folder,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  TicketCheck,
} from "lucide-react";

import { useRouter } from "next/navigation";

import AppShell from "@/components/app-shell";

import { useLanguage } from "@/components/language-provider";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { getMe } from "@/features/auth/api";

import { getCategories, getTickets } from "@/features/tickets/api";

import TicketCombobox, {
  type TicketComboboxOption,
} from "@/features/tickets/components/ticket-combobox";

import {
  PriorityIcon,
  StatusIcon,
} from "@/features/tickets/components/ticket-icons";

import { ApiError } from "@/lib/api/client";

import type { User } from "@/lib/types/auth";

import type {
  Category,
  Ticket,
  TicketPriority,
  TicketStatus,
} from "@/lib/types/ticket";

const PAGE_SIZE = 8;

export default function TicketsPage() {
  const router = useRouter();

  const { language } = useLanguage();

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  const [referenceLoading, setReferenceLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const ui =
    language === "id"
      ? {
          title: "Tiket",

          subtitle:
            "Kelola dan pantau seluruh tiket dukungan yang dapat Anda akses.",

          create: "Buat Tiket",

          search: "Cari",

          searchPlaceholder: "Cari nomor tiket, subjek, atau pelanggan...",

          status: "Status",

          priority: "Prioritas",

          category: "Kategori",

          allStatus: "Semua Status",

          allPriority: "Semua Prioritas",

          allCategory: "Semua Kategori",

          open: "Terbuka",

          inProgress: "Sedang Diproses",

          resolved: "Selesai",

          closed: "Ditutup",

          low: "Rendah",

          medium: "Sedang",

          high: "Tinggi",

          urgent: "Mendesak",

          reset: "Reset Filter",

          refresh: "Muat Ulang",

          loading: "Memuat tiket...",

          ticket: "Tiket",

          customer: "Pelanggan",

          categoryColumn: "Kategori",

          priorityColumn: "Prioritas",

          statusColumn: "Status",

          created: "Dibuat",

          action: "Aksi",

          view: "Lihat",

          edit: "Edit",

          emptyTitle: "Belum ada tiket",

          emptyDescription:
            "Tidak ada tiket yang cocok dengan filter atau pencarian saat ini.",

          loadFailed: "Gagal memuat daftar tiket.",

          previous: "Sebelumnya",

          next: "Berikutnya",

          page: "Halaman",

          of: "dari",

          total: "Total",

          items: "tiket",

          statusPlaceholder: "Pilih status...",

          priorityPlaceholder: "Pilih prioritas...",

          categoryPlaceholder: "Pilih kategori...",

          emptyStatus: "Status tidak ditemukan.",

          emptyPriority: "Prioritas tidak ditemukan.",

          emptyCategory: "Kategori tidak ditemukan.",
        }
      : {
          title: "Tickets",

          subtitle:
            "Manage and monitor all support tickets available to your account.",

          create: "Create Ticket",

          search: "Search",

          searchPlaceholder: "Search ticket number, subject, or customer...",

          status: "Status",

          priority: "Priority",

          category: "Category",

          allStatus: "All Statuses",

          allPriority: "All Priorities",

          allCategory: "All Categories",

          open: "Open",

          inProgress: "In Progress",

          resolved: "Resolved",

          closed: "Closed",

          low: "Low",

          medium: "Medium",

          high: "High",

          urgent: "Urgent",

          reset: "Reset Filters",

          refresh: "Refresh",

          loading: "Loading tickets...",

          ticket: "Ticket",

          customer: "Customer",

          categoryColumn: "Category",

          priorityColumn: "Priority",

          statusColumn: "Status",

          created: "Created",

          action: "Action",

          view: "View",

          edit: "Edit",

          emptyTitle: "No tickets found",

          emptyDescription: "No tickets match your current filters or search.",

          loadFailed: "Failed to load tickets.",

          previous: "Previous",

          next: "Next",

          page: "Page",

          of: "of",

          total: "Total",

          items: "tickets",

          statusPlaceholder: "Select status...",

          priorityPlaceholder: "Select priority...",

          categoryPlaceholder: "Select category...",

          emptyStatus: "No status found.",

          emptyPriority: "No priority found.",

          emptyCategory: "No category found.",
        };

  const loadTickets = useCallback(async () => {
    try {
      const response = await getTickets({
        status: statusFilter === "ALL" ? "" : (statusFilter as TicketStatus),
        priority: priorityFilter === "ALL" ? "" : (priorityFilter as TicketPriority),
        category_id: categoryFilter === "ALL" ? undefined : Number(categoryFilter),
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setTickets(response.data.items);
      setTotal(response.data.total);
      setPage((current) => Math.min(current, Math.max(1, Math.ceil(response.data.total / PAGE_SIZE))));
      setError("");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err.message);
        return;
      }
      setError(ui.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter, page, priorityFilter, router, search, statusFilter, ui.loadFailed]);

  function handleRefreshTickets() {
    setRefreshing(true);
    setError("");
    void loadTickets();
  }

  useEffect(() => {
    let active = true;
    void Promise.all([getCategories(), getMe()])
      .then(([categoryResponse, userResponse]) => {
        if (!active) return;
        setCategories(categoryResponse.data);
        setCurrentUser(userResponse.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : ui.loadFailed);
      })
      .finally(() => {
        if (active) setReferenceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router, ui.loadFailed]);

  useEffect(() => {
    let active = true;
    void getTickets({
      status: statusFilter === "ALL" ? "" : (statusFilter as TicketStatus),
      priority: priorityFilter === "ALL" ? "" : (priorityFilter as TicketPriority),
      category_id: categoryFilter === "ALL" ? undefined : Number(categoryFilter),
      search: search || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
      .then((response) => {
        if (!active) return;
        setTickets(response.data.items);
        setTotal(response.data.total);
        setPage((current) => Math.min(current, Math.max(1, Math.ceil(response.data.total / PAGE_SIZE))));
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError) {
          if (err.status === 401) {
            router.replace("/login");
            return;
          }
          setError(err.message);
          return;
        }
        setError(ui.loadFailed);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [categoryFilter, page, priorityFilter, router, search, statusFilter, ui.loadFailed]);

  const statusOptions = useMemo<TicketComboboxOption[]>(
    () => [
      {
        value: "ALL",

        label: ui.allStatus,

        icon: <TicketCheck className="size-4" />,
      },

      {
        value: "OPEN",

        label: ui.open,

        icon: <StatusIcon status="OPEN" />,
      },

      {
        value: "IN_PROGRESS",

        label: ui.inProgress,

        icon: <StatusIcon status="IN_PROGRESS" />,
      },

      {
        value: "RESOLVED",

        label: ui.resolved,

        icon: <StatusIcon status="RESOLVED" />,
      },

      {
        value: "CLOSED",

        label: ui.closed,

        icon: <StatusIcon status="CLOSED" />,
      },
    ],
    [ui.allStatus, ui.closed, ui.inProgress, ui.open, ui.resolved],
  );

  const priorityOptions = useMemo<TicketComboboxOption[]>(
    () => [
      {
        value: "ALL",

        label: ui.allPriority,

        icon: <TicketCheck className="size-4" />,
      },

      {
        value: "LOW",

        label: ui.low,

        icon: <PriorityIcon priority="LOW" />,
      },

      {
        value: "MEDIUM",

        label: ui.medium,

        icon: <PriorityIcon priority="MEDIUM" />,
      },

      {
        value: "HIGH",

        label: ui.high,

        icon: <PriorityIcon priority="HIGH" />,
      },

      {
        value: "URGENT",

        label: ui.urgent,

        icon: <PriorityIcon priority="URGENT" />,
      },
    ],
    [ui.allPriority, ui.high, ui.low, ui.medium, ui.urgent],
  );

  const categoryOptions = useMemo<TicketComboboxOption[]>(
    () => [
      {
        value: "ALL",

        label: ui.allCategory,

        icon: <Folder className="size-4" />,
      },

      ...categories.map((category) => ({
        value: String(category.id),

        label: getCategoryLabel(category, language),

        icon: <Folder className="size-4" />,
      })),
    ],
    [categories, language, ui.allCategory],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const canCreate =
    currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "CUSTOMER";

  function canEdit(ticket: Ticket) {
    if (!currentUser) {
      return false;
    }

    if (currentUser.role === "SUPER_ADMIN") {
      return true;
    }

    return (
      currentUser.role === "CUSTOMER" &&
      currentUser.id === ticket.customer_id &&
      ticket.status === "OPEN"
    );
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPage(1);

    setSearch(searchInput.trim());
  }

  function resetFilters() {
    setSearchInput("");

    setSearch("");

    setStatusFilter("ALL");

    setPriorityFilter("ALL");

    setCategoryFilter("ALL");

    setPage(1);
  }

  const hasFilter =
    search !== "" ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    categoryFilter !== "ALL";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1240px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[26px] font-bold tracking-[-0.04em] text-slate-950 dark:text-white">
              {ui.title}
            </h1>

            <p className="mt-1 text-[12px] font-medium text-slate-500">
              {ui.subtitle}
            </p>
          </div>

          {canCreate ? (
            <Link
              href="/tickets/new"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-[12px] font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            >
              <Plus className="size-4" />

              {ui.create}
            </Link>
          ) : null}
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#020617]">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 lg:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={ui.searchPlaceholder}
                className="pl-9"
              />
            </div>

            <Button type="submit" className="lg:w-auto">
              <Search className="size-4" />

              {ui.search}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={refreshing}
              onClick={handleRefreshTickets}
            >
              {refreshing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}

              {ui.refresh}
            </Button>
          </form>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
                {ui.status}
              </p>

              <TicketCombobox
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value || "ALL");

                  setPage(1);
                }}
                options={statusOptions}
                placeholder={ui.statusPlaceholder}
                emptyText={ui.emptyStatus}
                disabled={loading}
              />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
                {ui.priority}
              </p>

              <TicketCombobox
                value={priorityFilter}
                onValueChange={(value) => {
                  setPriorityFilter(value || "ALL");

                  setPage(1);
                }}
                options={priorityOptions}
                placeholder={ui.priorityPlaceholder}
                emptyText={ui.emptyPriority}
                disabled={loading}
              />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
                {ui.category}
              </p>

              <TicketCombobox
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value || "ALL");

                  setPage(1);
                }}
                options={categoryOptions}
                placeholder={ui.categoryPlaceholder}
                emptyText={ui.emptyCategory}
                disabled={referenceLoading || loading}
              />
            </div>
          </div>

          {hasFilter ? (
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                <FilterX className="size-4" />

                {ui.reset}
              </Button>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-[11px] text-slate-500">
            {ui.total}:{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {total} {ui.items}
            </strong>
          </p>

          <p className="text-[11px] text-slate-500">
            {ui.page} {page} {ui.of} {totalPages}
          </p>
        </div>

        {loading ? (
          <div className="mt-4 flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#020617]">
            <LoaderCircle className="size-6 animate-spin text-slate-400" />

            <p className="text-sm text-slate-500">{ui.loading}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="mt-4 flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-center dark:border-slate-800 dark:bg-[#020617]">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
              <TicketCheck className="size-5 text-slate-500" />
            </div>

            <h2 className="mt-4 text-sm font-bold">{ui.emptyTitle}</h2>

            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
              {ui.emptyDescription}
            </p>

            {hasFilter ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={resetFilters}
              >
                <FilterX className="size-4" />

                {ui.reset}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#020617] md:block">
              <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.65fr_0.8fr_0.8fr_110px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
                <span>{ui.ticket}</span>

                <span>{ui.customer}</span>

                <span>{ui.categoryColumn}</span>

                <span>{ui.priorityColumn}</span>

                <span>{ui.statusColumn}</span>

                <span>{ui.created}</span>

                <span className="text-right">{ui.action}</span>
              </div>

              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="grid grid-cols-[1.4fr_1fr_0.8fr_0.65fr_0.8fr_0.8fr_110px] items-center border-b border-slate-100 px-4 py-4 last:border-b-0 dark:border-slate-900"
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {ticket.ticket_number}
                    </p>

                    <p className="mt-1 truncate text-[12px] font-bold text-slate-900 dark:text-slate-100">
                      {ticket.subject}
                    </p>
                  </div>

                  <div className="min-w-0 pr-3">
                    <p className="truncate text-[12px] font-medium">
                      {ticket.customer_name}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {ticket.customer_email}
                    </p>
                  </div>

                  <p className="truncate pr-3 text-[11px] text-slate-600 dark:text-slate-300">
                    {getCategoryName(ticket, language)}
                  </p>

                  <PriorityBadge
                    priority={ticket.priority}
                    language={language}
                  />

                  <StatusBadge status={ticket.status} language={language} />

                  <p className="text-[11px] text-slate-500">
                    {formatDate(ticket.created_at, language)}
                  </p>

                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      title={ui.view}
                      className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                    >
                      <Eye className="size-3.5" />
                    </Link>

                    {canEdit(ticket) ? (
                      <Link
                        href={`/tickets/${ticket.id}/edit`}
                        title={ui.edit}
                        className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                      >
                        <Pencil className="size-3.5" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:hidden">
              {tickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#020617]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {ticket.ticket_number}
                      </p>

                      <h2 className="mt-1 break-words text-sm font-bold">
                        {ticket.subject}
                      </h2>
                    </div>

                    <StatusBadge status={ticket.status} language={language} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        {ui.customer}
                      </p>

                      <p className="mt-1 font-medium">{ticket.customer_name}</p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        {ui.categoryColumn}
                      </p>

                      <p className="mt-1 font-medium">
                        {getCategoryName(ticket, language)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        {ui.priorityColumn}
                      </p>

                      <div className="mt-1">
                        <PriorityBadge
                          priority={ticket.priority}
                          language={language}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        {ui.created}
                      </p>

                      <p className="mt-1 font-medium">
                        {formatDate(ticket.created_at, language)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-900">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 text-[11px] font-semibold dark:border-slate-700"
                    >
                      <Eye className="size-3.5" />

                      {ui.view}
                    </Link>

                    {canEdit(ticket) ? (
                      <Link
                        href={`/tickets/${ticket.id}/edit`}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 text-[11px] font-semibold dark:border-slate-700"
                      >
                        <Pencil className="size-3.5" />

                        {ui.edit}
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {!loading && total > PAGE_SIZE ? (
          <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[11px] text-slate-500">
              {ui.page} <strong>{page}</strong> {ui.of}{" "}
              <strong>{totalPages}</strong>
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="size-4" />

                {ui.previous}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                {ui.next}

                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function StatusBadge({
  status,
  language,
}: {
  status: TicketStatus;

  language: "id" | "en";
}) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-semibold dark:border-slate-700 dark:bg-slate-900">
      <StatusIcon status={status} className="size-3" />

      {getStatusLabel(status, language)}
    </span>
  );
}

function PriorityBadge({
  priority,
  language,
}: {
  priority: TicketPriority;

  language: "id" | "en";
}) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-semibold dark:border-slate-700 dark:bg-slate-900">
      <PriorityIcon priority={priority} className="size-3" />

      {getPriorityLabel(priority, language)}
    </span>
  );
}

function getStatusLabel(status: TicketStatus, language: "id" | "en") {
  const labels = {
    OPEN: {
      id: "Terbuka",
      en: "Open",
    },

    IN_PROGRESS: {
      id: "Sedang Diproses",
      en: "In Progress",
    },

    RESOLVED: {
      id: "Selesai",
      en: "Resolved",
    },

    CLOSED: {
      id: "Ditutup",
      en: "Closed",
    },
  };

  return labels[status][language];
}

function getPriorityLabel(priority: TicketPriority, language: "id" | "en") {
  const labels = {
    LOW: {
      id: "Rendah",
      en: "Low",
    },

    MEDIUM: {
      id: "Sedang",
      en: "Medium",
    },

    HIGH: {
      id: "Tinggi",
      en: "High",
    },

    URGENT: {
      id: "Mendesak",
      en: "Urgent",
    },
  };

  return labels[priority][language];
}

function getCategoryLabel(category: Category, language: "id" | "en") {
  const labels: Record<
    string,
    {
      id: string;
      en: string;
    }
  > = {
    "technical-issue": {
      id: "Masalah Teknis",
      en: "Technical Issue",
    },

    account: {
      id: "Akun",
      en: "Account",
    },

    billing: {
      id: "Penagihan",
      en: "Billing",
    },

    "feature-request": {
      id: "Permintaan Fitur",
      en: "Feature Request",
    },

    "general-support": {
      id: "Dukungan Umum",
      en: "General Support",
    },
  };

  return labels[category.slug]?.[language] ?? category.name;
}

function getCategoryName(ticket: Ticket, language: "id" | "en") {
  const labels: Record<
    string,
    {
      id: string;
      en: string;
    }
  > = {
    "technical-issue": {
      id: "Masalah Teknis",
      en: "Technical Issue",
    },

    account: {
      id: "Akun",
      en: "Account",
    },

    billing: {
      id: "Penagihan",
      en: "Billing",
    },

    "feature-request": {
      id: "Permintaan Fitur",
      en: "Feature Request",
    },

    "general-support": {
      id: "Dukungan Umum",
      en: "General Support",
    },
  };

  return labels[ticket.category_slug]?.[language] ?? ticket.category_name;
}

function formatDate(value: string, language: "id" | "en") {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",

    timeStyle: "short",
  }).format(new Date(value));
}
