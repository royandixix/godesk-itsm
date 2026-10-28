"use client";
import Link from "next/link";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  LoaderCircle,
  Lock,
  RefreshCcw,
  TicketCheck,
  type LucideIcon,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { motion, type Variants } from "motion/react";

import AppShell from "@/components/app-shell";

import { useLanguage } from "@/components/language-provider";

import { Button } from "@/components/ui/button";

import { getDashboard } from "@/features/dashboard/api";

import { ApiError } from "@/lib/api/client";

import type {
  DashboardData,
  DashboardRecentTicket,
} from "@/lib/types/dashboard";
const monthKeys = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const container: Variants = {
  hidden: {
    opacity: 0,
  },

  show: {
    opacity: 1,

    transition: {
      staggerChildren: 0.06,
    },
  },
};

const item: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },

  show: {
    opacity: 1,
    y: 0,

    transition: {
      duration: 0.4,
    },
  },
};

export default function DashboardPage() {
  const router = useRouter();

  const { language, t } = useLanguage();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const ui =
    language === "id"
      ? {
          title: "Dashboard",

          subtitle:
            "Ringkasan aktivitas dan performa tiket GoDesk berdasarkan data terbaru.",

          createTicket: "Buat Tiket",

          refresh: "Muat Ulang",

          refreshing: "Memuat...",

          totalTickets: "Total Tiket",

          openTickets: "Tiket Terbuka",

          inProgress: "Sedang Diproses",

          resolved: "Selesai",

          closed: "Ditutup",

          priorities: "Statistik Prioritas",

          prioritiesDescription:
            "Distribusi tiket berdasarkan tingkat prioritas.",

          low: "Rendah",

          medium: "Sedang",

          high: "Tinggi",

          urgent: "Mendesak",

          customers: "Pelanggan Terkait",

          chartTitle: "Aktivitas Tiket",

          chartDescription: "Jumlah tiket yang dibuat setiap bulan.",

          recentTitle: "Tiket Terbaru",

          recentDescription: "Lima tiket terbaru yang dapat Anda akses.",

          noRecent: "Belum ada tiket terbaru.",

          viewTicket: "Lihat Tiket",

          allTickets: "Lihat Semua Tiket",

          allTicketsDescription:
            "Buka daftar lengkap tiket dan kelola data yang tersedia.",

          newTicket: "Buat Tiket Dukungan",

          newTicketDescription:
            "Buat tiket baru untuk permintaan atau masalah yang membutuhkan bantuan.",

          tickets: "tiket",

          loading: "Memuat dashboard...",

          failedTitle: "Dashboard Gagal Dimuat",

          failed:
            "Data dashboard tidak dapat dimuat. Pastikan backend GoDesk sedang berjalan.",

          retry: "Coba Lagi",

          scopeAll: "Anda sedang melihat seluruh data tiket pada sistem.",

          scopeAgent:
            "Anda sedang melihat tiket yang ditugaskan kepada akun Anda.",

          scopeCustomer:
            "Anda sedang melihat tiket yang dibuat oleh akun Anda.",

          role: "Peran",

          year: "Tahun",

          ticketUnit: "Tiket",
        }
      : {
          title: "Dashboard",

          subtitle:
            "Overview of GoDesk ticket activity and performance using the latest data.",

          createTicket: "Create Ticket",

          refresh: "Refresh",

          refreshing: "Refreshing...",

          totalTickets: "Total Tickets",

          openTickets: "Open Tickets",

          inProgress: "In Progress",

          resolved: "Resolved",

          closed: "Closed",

          priorities: "Priority Statistics",

          prioritiesDescription: "Ticket distribution based on priority level.",

          low: "Low",

          medium: "Medium",

          high: "High",

          urgent: "Urgent",

          customers: "Related Customers",

          chartTitle: "Ticket Activity",

          chartDescription: "Number of tickets created each month.",

          recentTitle: "Recent Tickets",

          recentDescription: "The five most recent tickets available to you.",

          noRecent: "No recent tickets yet.",

          viewTicket: "View Ticket",

          allTickets: "View All Tickets",

          allTicketsDescription:
            "Open the complete ticket list and manage available data.",

          newTicket: "Create Support Ticket",

          newTicketDescription:
            "Create a new support ticket for an issue or request that needs assistance.",

          tickets: "tickets",

          loading: "Loading dashboard...",

          failedTitle: "Failed to Load Dashboard",

          failed:
            "Dashboard data could not be loaded. Make sure the GoDesk backend is running.",

          retry: "Try Again",

          scopeAll: "You are viewing all ticket data in the system.",

          scopeAgent: "You are viewing tickets assigned to your account.",

          scopeCustomer: "You are viewing tickets created by your account.",

          role: "Role",

          year: "Year",

          ticketUnit: "Tickets",
        };

  const loadDashboard = useCallback(async () => {
    try {
      const response = await getDashboard();
      setDashboard(response.data);
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
      setError(ui.failed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, ui.failed]);

  useEffect(() => {
    let active = true;
    void getDashboard()
      .then((response) => {
        if (!active) return;
        setDashboard(response.data);
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
        setError(ui.failed);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router, ui.failed]);

  function handleRefreshDashboard() {
    setRefreshing(true);
    setError("");
    void loadDashboard();
  }

  function handleRetryDashboard() {
    setLoading(true);
    setError("");
    void loadDashboard();
  }

  const maxMonthly = useMemo(() => {
    if (!dashboard || dashboard.monthly.length === 0) {
      return 1;
    }

    return Math.max(1, ...dashboard.monthly.map((month) => month.total));
  }, [dashboard]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[540px] flex-col items-center justify-center gap-3">
          <LoaderCircle className="size-7 animate-spin text-slate-400" />

          <p className="text-[12px] font-medium text-slate-500">{ui.loading}</p>
        </div>
      </AppShell>
    );
  }

  if (!dashboard) {
    return (
      <AppShell>
        <div className="flex min-h-[540px] flex-col items-center justify-center px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="size-6 text-amber-500" />
          </div>

          <h1 className="mt-5 text-lg font-bold">{ui.failedTitle}</h1>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            {error || ui.failed}
          </p>

          <Button
            type="button"
            className="mt-5"
            onClick={handleRetryDashboard}
          >
            <RefreshCcw className="size-4" />

            {ui.retry}
          </Button>
        </div>
      </AppShell>
    );
  }

  const canCreateTicket =
    dashboard.role === "SUPER_ADMIN" || dashboard.role === "CUSTOMER";

  const scopeText =
    dashboard.role === "AGENT"
      ? ui.scopeAgent
      : dashboard.role === "CUSTOMER"
        ? ui.scopeCustomer
        : ui.scopeAll;

  return (
    <AppShell>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1240px] px-4 py-7 sm:px-6 lg:px-8"
      >
        <motion.section
          variants={item}
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <h1 className="text-[26px] font-bold tracking-[-0.04em] text-slate-950 dark:text-white">
              {ui.title}
            </h1>

            <p className="mt-1 text-[12px] font-medium text-slate-500">
              {ui.subtitle}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
              <span>
                {ui.role}:{" "}
                <strong className="font-semibold text-slate-600 dark:text-slate-300">
                  {formatRole(dashboard.role)}
                </strong>
              </span>

              <span>
                {ui.year}:{" "}
                <strong className="font-semibold text-slate-600 dark:text-slate-300">
                  {dashboard.year}
                </strong>
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">{scopeText}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={handleRefreshDashboard}
            >
              {refreshing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}

              {refreshing ? ui.refreshing : ui.refresh}
            </Button>

            {canCreateTicket ? (
              <Link
                href="/tickets/new"
                className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-[12px] font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              >
                <TicketCheck className="size-4" />

                {ui.createTicket}
              </Link>
            ) : null}
          </div>
        </motion.section>

        {error ? (
          <motion.div
            variants={item}
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </motion.div>
        ) : null}

        <motion.section
          variants={item}
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          <StatCard
            title={ui.totalTickets}
            value={dashboard.stats.total}
            icon={TicketCheck}
          />

          <StatCard
            title={ui.openTickets}
            value={dashboard.stats.open}
            icon={Circle}
          />

          <StatCard
            title={ui.inProgress}
            value={dashboard.stats.in_progress}
            icon={Clock3}
          />

          <StatCard
            title={ui.resolved}
            value={dashboard.stats.resolved}
            icon={CheckCircle2}
          />

          <StatCard
            title={ui.closed}
            value={dashboard.stats.closed}
            icon={Lock}
          />
        </motion.section>

        <motion.section
          variants={item}
          className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#020617]"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-[15px] font-bold text-slate-950 dark:text-white">
                {ui.priorities}
              </h2>

              <p className="mt-1 text-[11px] text-slate-500">
                {ui.prioritiesDescription}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-500 dark:bg-slate-900">
              {ui.customers}:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {dashboard.stats.customers}
              </strong>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PriorityCard title={ui.low} value={dashboard.priorities.low} />

            <PriorityCard
              title={ui.medium}
              value={dashboard.priorities.medium}
            />

            <PriorityCard title={ui.high} value={dashboard.priorities.high} />

            <PriorityCard
              title={ui.urgent}
              value={dashboard.priorities.urgent}
            />
          </div>
        </motion.section>

        <motion.section
          variants={item}
          className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.95fr]"
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#020617] sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-[16px] font-bold text-slate-950 dark:text-white">
                  {ui.chartTitle}
                </h2>

                <p className="mt-1 text-[11px] text-slate-500">
                  {ui.chartDescription} {dashboard.year}
                </p>
              </div>

              <p className="text-[11px] text-slate-500">
                {dashboard.stats.total} {ui.tickets}
              </p>
            </div>

            <div className="mt-8 overflow-x-auto pb-1">
              <div className="flex min-w-[650px] gap-4">
                <div className="flex h-[300px] w-[38px] shrink-0 flex-col justify-between pb-7 text-right text-[10px] text-slate-500">
                  <span>{maxMonthly}</span>

                  <span>{axisValue(maxMonthly, 0.75)}</span>

                  <span>{axisValue(maxMonthly, 0.5)}</span>

                  <span>{axisValue(maxMonthly, 0.25)}</span>

                  <span>0</span>
                </div>

                <div className="relative h-[300px] flex-1">
                  <div className="absolute inset-0 flex flex-col justify-between pb-7">
                    {Array.from({
                      length: 5,
                    }).map((_, index) => (
                      <div
                        key={index}
                        className="border-t border-slate-200 dark:border-slate-800"
                      />
                    ))}
                  </div>

                  <div className="absolute inset-0 z-10 flex items-end justify-between gap-2 pb-7">
                    {dashboard.monthly.map((month, index) => {
                      const percentage =
                        month.total === 0
                          ? 0
                          : Math.max(8, (month.total / maxMonthly) * 100);

                      return (
                        <div
                          key={month.month}
                          className="relative flex h-full flex-1 items-end justify-center"
                        >
                          <div className="absolute bottom-8 text-[9px] font-bold text-slate-500">
                            {month.total > 0 ? month.total : ""}
                          </div>

                          <motion.div
                            title={`${month.total} ${ui.ticketUnit}`}
                            initial={{
                              height: 0,
                            }}
                            animate={{
                              height: `${percentage}%`,
                            }}
                            transition={{
                              duration: 0.5,

                              delay: index * 0.035,
                            }}
                            className="w-full max-w-[38px] rounded-t-md bg-slate-900 dark:bg-slate-200"
                          />

                          <span className="absolute -bottom-5 text-[10px] text-slate-500">
                            {t(`months.${monthKeys[index]}`)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#020617] sm:p-6">
            <h2 className="text-[16px] font-bold text-slate-950 dark:text-white">
              {ui.recentTitle}
            </h2>

            <p className="mt-1.5 text-[12px] text-slate-500">
              {ui.recentDescription}
            </p>

            {dashboard.recent_tickets.length === 0 ? (
              <div className="flex min-h-[285px] flex-col items-center justify-center text-center">
                <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
                  <TicketCheck className="size-5 text-slate-400" />
                </div>

                <p className="mt-3 text-sm font-medium text-slate-500">
                  {ui.noRecent}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {dashboard.recent_tickets.map((ticket) => (
                  <RecentTicketItem
                    key={ticket.id}
                    ticket={ticket}
                    language={language}
                    t={t}
                    viewLabel={ui.viewTicket}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          variants={item}
          className={`mt-4 grid gap-4 ${
            canCreateTicket ? "md:grid-cols-2" : "grid-cols-1"
          }`}
        >
          <Link
            href="/tickets"
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-slate-800 dark:bg-[#020617] dark:hover:bg-slate-900/50"
          >
            <p className="text-[13px] font-bold">{ui.allTickets}</p>

            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {ui.allTicketsDescription}
            </p>
          </Link>

          {canCreateTicket ? (
            <Link
              href="/tickets/new"
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-slate-800 dark:bg-[#020617] dark:hover:bg-slate-900/50"
            >
              <p className="text-[13px] font-bold">{ui.newTicket}</p>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {ui.newTicketDescription}
              </p>
            </Link>
          ) : null}
        </motion.section>

        <footer className="mt-10 flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 text-[11px] text-slate-500 dark:border-slate-800 sm:flex-row">
          <span>{t("footer.copyright")}</span>

          <span>{t("footer.platform")}</span>
        </footer>
      </motion.div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;

  value: number;

  icon: LucideIcon;
}) {
  return (
    <motion.div
      whileHover={{
        y: -2,
      }}
      transition={{
        duration: 0.15,
      }}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#020617]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
          {title}
        </p>

        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900">
          <Icon className="size-[16px] text-slate-500" />
        </div>
      </div>

      <motion.p
        initial={{
          opacity: 0,
          y: 5,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="mt-6 text-[28px] font-bold tracking-[-0.04em]"
      >
        {value}
      </motion.p>
    </motion.div>
  );
}

function PriorityCard({
  title,
  value,
}: {
  title: string;

  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[11px] font-medium text-slate-500">{title}</p>

      <p className="mt-2 text-xl font-bold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function RecentTicketItem({
  ticket,
  language,
  t,
  viewLabel,
}: {
  ticket: DashboardRecentTicket;

  language: "id" | "en";

  t: (key: string) => string;

  viewLabel: string;
}) {
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="block rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/50"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold dark:bg-slate-900">
          {getInitials(ticket.customer_name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {ticket.ticket_number}
              </p>

              <p className="mt-1 truncate text-[12px] font-bold">
                {ticket.subject}
              </p>
            </div>

            <span className="shrink-0 text-[9px] text-slate-400">
              {formatDate(ticket.created_at, language)}
            </span>
          </div>

          <p className="mt-1 truncate text-[10px] text-slate-500">
            {ticket.customer_name} · {ticket.category_name}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-semibold dark:border-slate-700">
              {t(`status.${ticket.status}`)}
            </span>

            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-semibold dark:border-slate-700">
              {t(`priority.${ticket.priority}`)}
            </span>

            <span className="ml-auto text-[9px] font-semibold text-slate-500">
              {viewLabel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string, language: "id" | "en") {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    day: "2-digit",

    month: "short",
  }).format(new Date(value));
}

function formatRole(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";

    case "MANAGER":
      return "Manager";

    case "AGENT":
      return "Agent";

    case "CUSTOMER":
      return "Customer";

    default:
      return role;
  }
}

function axisValue(maximum: number, multiplier: number) {
  if (maximum <= 1) {
    return maximum;
  }

  return Math.max(1, Math.round(maximum * multiplier));
}
