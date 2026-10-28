
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Filter,
  RefreshCcw,
  Search,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import AppShell from "@/components/app-shell";
import { getMe } from "@/features/auth/api";
import {
  getReports,
  getReportOptions,
  exportReportCSV,
  reportParams,
  type CountItem,
  type ReportData,
  type ReportFilters,
  type ReportOptions,
} from "@/features/reports/api";

const PAGE_SIZE = 20;

const cardClass =
  "rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950";

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";

function makassarDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86400000);

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function defaultFilters(): ReportFilters {
  return {
    from: makassarDate(-29),
    to: makassarDate(),
    status: "",
    priority: "",
    category_id: "",
    agent_id: "",
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function StatusLabel({ value }: { value: string }) {
  const color =
    value === "RESOLVED" ||
    value === "CLOSED" ||
    value === "MET"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : value === "BREACHED"
        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        : value === "OPEN"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: typeof Ticket;
}) {
  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {value}
          </p>
        </div>
        <div className="rounded-lg bg-indigo-50 p-2.5 dark:bg-indigo-950">
          <Icon className="size-5 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
    </div>
  );
}

function BarList({
  items,
  emptyMessage = "Belum ada data",
}: {
  items: CountItem[];
  emptyMessage?: string;
}) {
  const maximum = Math.max(
    1,
    ...items.map((item) => item.total),
  );

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.slice(0, 10).map((item) => (
        <div key={item.name}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="truncate text-xs font-medium">
              {item.name.replaceAll("_", " ")}
            </span>
            <span className="text-xs font-bold tabular-nums">
              {formatNumber(item.total)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{
                width: `${(item.total / maximum) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ items }: { items: CountItem[] }) {
  const visible = items.slice(-45);
  const maximum = Math.max(
    1,
    ...visible.map((item) => item.total),
  );

  if (visible.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Belum ada data tren.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-48 items-end gap-1 border-b border-slate-200 pb-1 dark:border-slate-800">
        {visible.map((item) => (
          <div
            key={item.name}
            className="group flex h-full min-w-0 flex-1 items-end"
            title={`${item.name}: ${item.total} tiket`}
          >
            <div
              className="w-full rounded-t-sm bg-indigo-500 transition-colors group-hover:bg-indigo-400"
              style={{
                height:
                  item.total === 0
                    ? "0%"
                    : `${Math.max(
                        4,
                        (item.total / maximum) * 100,
                      )}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between gap-4 text-xs text-slate-500">
        <span>{visible[0]?.name}</span>
        <span>{visible[visible.length - 1]?.name}</span>
      </div>
      {items.length > 45 && (
        <p className="mt-2 text-xs text-slate-500">
          Grafik menampilkan 45 hari terakhir.
        </p>
      )}
    </div>
  );
}

function SlaMetric({
  title,
  met,
  breached,
  rate,
}: {
  title: string;
  met: number;
  breached: number;
  rate: number;
}) {
  const evaluated = met + breached;
  const percentage = Math.max(0, Math.min(100, rate));

  return (
    <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Clock3 className="size-4 text-indigo-500" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-4 text-3xl font-bold">
        {evaluated > 0
          ? `${rate.toFixed(1)}%`
          : "Belum dinilai"}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between gap-3 text-xs text-slate-500">
        <span>Terpenuhi: {formatNumber(met)}</span>
        <span>Terlambat: {formatNumber(breached)}</span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [draftFilters, setDraftFilters] =
    useState<ReportFilters>(defaultFilters);

  const [filters, setFilters] =
    useState<ReportFilters>(defaultFilters);

  const [options, setOptions] = useState<ReportOptions>({
    categories: [],
    agents: [],
  });

  const [report, setReport] = useState<ReportData | null>(null);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const me = await getMe();

        if (!active) return;

        if (
          me.data.role !== "SUPER_ADMIN" &&
          me.data.role !== "MANAGER"
        ) {
          router.replace("/dashboard");
          return;
        }

        setAuthorized(true);

        const response = await getReportOptions();

        if (active) {
          setOptions(response.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memeriksa akses laporan",
          );
        }
      } finally {
        if (active) {
          setCheckingAccess(false);
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!authorized) return;

    let active = true;

    getReports(filters, PAGE_SIZE, page * PAGE_SIZE)
      .then((response) => {
        if (!active) return;

        setReport(response.data);
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;

        setReport(null);
        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil laporan",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authorized, filters, page, revision]);

  function updateFilter(
    key: keyof ReportFilters,
    value: string,
  ) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters() {
    if (
      !draftFilters.from ||
      !draftFilters.to ||
      draftFilters.from > draftFilters.to
    ) {
      setError("Rentang tanggal laporan tidak valid.");
      return;
    }

    setError("");
    setLoading(true);
    setPage(0);
    setReport(null);
    setFilters({ ...draftFilters });
    setRevision((value) => value + 1);
  }

  function resetFilters() {
    const defaults = defaultFilters();

    setError("");
    setLoading(true);
    setDraftFilters(defaults);
    setFilters(defaults);
    setPage(0);
    setReport(null);
    setRevision((value) => value + 1);
  }

  function refreshReport() {
    if (!authorized || loading) return;

    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }

  function changePage(nextPage: number) {
    if (loading || nextPage < 0) return;

    setLoading(true);
    setError("");
    setReport(null);
    setPage(nextPage);
  }

  async function downloadCSV() {
    if (!report || exporting) return;

    setExporting(true);
    setError("");

    try {
      await exportReportCSV(filters);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengunduh CSV",
      );
    } finally {
      setExporting(false);
    }
  }

  function openPDF() {
    if (!report) return;

    const params = reportParams(filters, 100, 0);

    window.open(
      `/reports/print?${params}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const totalPages = Math.max(
    1,
    Math.ceil((report?.total ?? 0) / PAGE_SIZE),
  );

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">
              GoDesk / Management
            </p>
            <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
              <BarChart3 className="size-6 text-indigo-500" />
              Reports & Analytics
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Analisis tiket, performa Agent, dan pencapaian SLA.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshReport}
              disabled={!authorized || loading}
              className={buttonClass}
            >
              <RefreshCcw className="size-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void downloadCSV()}
              disabled={!report || exporting || loading}
              className={buttonClass}
            >
              <Download className="size-4" />
              {exporting ? "Mengekspor..." : "Export CSV"}
            </button>
            <button
              type="button"
              onClick={openPDF}
              disabled={!report || loading}
              className={buttonClass}
            >
              <FileText className="size-4" />
              Cetak / PDF
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <section className={cardClass}>
          <div className="mb-5 flex items-center gap-2">
            <Filter className="size-4 text-indigo-500" />
            <h2 className="font-semibold">Filter Laporan</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold">
              Tanggal Mulai
              <input
                type="date"
                value={draftFilters.from}
                onChange={(event) =>
                  updateFilter("from", event.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className="text-xs font-semibold">
              Tanggal Akhir
              <input
                type="date"
                value={draftFilters.to}
                onChange={(event) =>
                  updateFilter("to", event.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className="text-xs font-semibold">
              Status Tiket
              <select
                value={draftFilters.status}
                onChange={(event) =>
                  updateFilter("status", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Semua Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>
            <label className="text-xs font-semibold">
              Prioritas
              <select
                value={draftFilters.priority}
                onChange={(event) =>
                  updateFilter("priority", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Semua Prioritas</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label className="text-xs font-semibold">
              Kategori
              <select
                value={draftFilters.category_id}
                onChange={(event) =>
                  updateFilter("category_id", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Semua Kategori</option>
                {options.categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Agent
              <select
                value={draftFilters.agent_id}
                onChange={(event) =>
                  updateFilter("agent_id", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Semua Agent</option>
                {options.agents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Zona waktu Asia/Makassar · Maksimal 366 hari.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                disabled={loading}
                className={buttonClass}
              >
                Reset
              </button>
              <button
                type="button"
                disabled={!authorized || loading}
                onClick={applyFilters}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Search className="size-4" />
                Terapkan Filter
              </button>
            </div>
          </div>
        </section>

        {(checkingAccess || (loading && !report)) && (
          <div className={cardClass}>
            <div className="flex items-center gap-3">
              <RefreshCcw className="size-5 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-500">
                Memuat Reports & Analytics...
              </p>
            </div>
          </div>
        )}

        {report && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                title="Total Tiket"
                value={formatNumber(report.summary.total)}
                icon={Ticket}
              />
              <MetricCard
                title="Open"
                value={formatNumber(report.summary.open)}
                icon={Clock3}
              />
              <MetricCard
                title="In Progress"
                value={formatNumber(report.summary.in_progress)}
                icon={Activity}
              />
              <MetricCard
                title="Resolved"
                value={formatNumber(report.summary.resolved)}
                icon={CheckCircle2}
              />
              <MetricCard
                title="Closed"
                value={formatNumber(report.summary.closed)}
                icon={XCircle}
              />
              <MetricCard
                title="Pelanggan Unik"
                value={formatNumber(report.summary.customers)}
                icon={Users}
              />
            </section>

            <section className={cardClass}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">
                  Average Resolution Time
                </h2>
                <Clock3 className="size-5 text-indigo-500" />
              </div>
              <p className="mt-3 text-3xl font-bold">
                {report.summary.average_resolution_hours.toFixed(1)}
                <span className="ml-2 text-base font-medium text-slate-500">
                  jam
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Rata-rata durasi penyelesaian tiket pada periode yang dipilih.
              </p>
            </section>

            <div className="grid gap-4 xl:grid-cols-3">
              <section className={`${cardClass} xl:col-span-2`}>
                <h2 className="mb-5 font-semibold">
                  Tren Tiket Harian
                </h2>
                <TrendChart items={report.trend} />
              </section>
              <section className={cardClass}>
                <h2 className="mb-5 font-semibold">
                  Distribusi Status
                </h2>
                <BarList items={report.statuses} />
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className={cardClass}>
                <h2 className="mb-5 font-semibold">
                  Tiket Berdasarkan Prioritas
                </h2>
                <BarList items={report.priorities} />
              </section>
              <section className={cardClass}>
                <h2 className="mb-5 font-semibold">
                  Tiket Berdasarkan Kategori
                </h2>
                <BarList items={report.categories} />
              </section>
            </div>

            <section className={cardClass}>
              <div className="mb-5">
                <h2 className="font-semibold">
                  SLA Performance
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Evaluasi SLA berdasarkan target respons dan penyelesaian.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SlaMetric
                  title="First Response SLA"
                  met={report.sla.response_met}
                  breached={report.sla.response_breached}
                  rate={report.sla.response_rate}
                />
                <SlaMetric
                  title="Resolution SLA"
                  met={report.sla.resolution_met}
                  breached={report.sla.resolution_breached}
                  rate={report.sla.resolution_rate}
                />
              </div>
            </section>

            <section className={cardClass}>
              <div className="mb-5 flex items-center gap-2">
                <Users className="size-5 text-indigo-500" />
                <h2 className="font-semibold">
                  Agent Performance
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800">
                    <tr>
                      <th className="pb-3 pr-4">Agent</th>
                      <th className="pb-3 pr-4">Total</th>
                      <th className="pb-3 pr-4">Selesai</th>
                      <th className="pb-3 pr-4">SLA Terpenuhi</th>
                      <th className="pb-3 pr-4">SLA Terlambat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.agents.map((agent) => (
                      <tr
                        key={agent.id}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-4 pr-4 font-medium">
                          {agent.name}
                        </td>
                        <td>{formatNumber(agent.total)}</td>
                        <td>{formatNumber(agent.completed)}</td>
                        <td className="text-emerald-600">
                          {formatNumber(agent.sla_met)}
                        </td>
                        <td className="text-red-500">
                          {formatNumber(agent.sla_breached)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.agents.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Belum ada data performa Agent.
                  </p>
                )}
              </div>
            </section>

            <section className={cardClass}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Ticket Reports</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Daftar tiket berdasarkan filter laporan.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {formatNumber(report.total)} tiket ditemukan
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800">
                    <tr>
                      <th className="pb-3 pr-4">Tiket</th>
                      <th className="pb-3 pr-4">Kategori</th>
                      <th className="pb-3 pr-4">Pelanggan</th>
                      <th className="pb-3 pr-4">Agent</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Prioritas</th>
                      <th className="pb-3 pr-4">SLA Respons</th>
                      <th className="pb-3 pr-4">SLA Penyelesaian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.tickets.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-4 pr-4">
                          <Link
                            href={`/tickets/${item.id}`}
                            className="font-semibold text-indigo-500 hover:underline"
                          >
                            {item.ticket_number}
                          </Link>
                          <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                            {item.subject}
                          </p>
                        </td>
                        <td className="pr-4">{item.category}</td>
                        <td className="pr-4">{item.customer}</td>
                        <td className="pr-4">{item.agent}</td>
                        <td className="pr-4">
                          <StatusLabel value={item.status} />
                        </td>
                        <td className="pr-4">{item.priority}</td>
                        <td className="pr-4">
                          <StatusLabel value={item.sla_response} />
                        </td>
                        <td className="pr-4">
                          <StatusLabel value={item.sla_resolution} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.tickets.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Tidak ada tiket pada periode ini.
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Halaman {page + 1} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={page === 0 || loading}
                    onClick={() => changePage(page - 1)}
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={
                      page + 1 >= totalPages || loading
                    }
                    onClick={() => changePage(page + 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
