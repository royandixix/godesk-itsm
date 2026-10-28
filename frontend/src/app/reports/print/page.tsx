"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { getMe } from "@/features/auth/api";
import {
  getReports,
  type CountItem,
  type ReportData,
  type ReportFilters,
} from "@/features/reports/api";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Makassar",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function Distribution({ title, items }: { title: string; items: CountItem[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500">Tidak ada data</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex justify-between gap-3 border-b border-slate-200 pb-2 text-xs"
            >
              <span>{item.name.replaceAll("_", " ")}</span>
              <span className="font-bold">{formatNumber(item.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PrintReportsPage() {
  const router = useRouter();

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const query = new URLSearchParams(window.location.search);

        const filters: ReportFilters = {
          from: query.get("from") ?? "",
          to: query.get("to") ?? "",
          status: query.get("status") ?? "",
          priority: query.get("priority") ?? "",
          category_id: query.get("category_id") ?? "",
          agent_id: query.get("agent_id") ?? "",
        };

        if (!filters.from || !filters.to) {
          router.replace("/reports");
          return;
        }

        const me = await getMe();

        if (!active) return;

        if (me.data.role !== "SUPER_ADMIN" && me.data.role !== "MANAGER") {
          router.replace("/dashboard");
          return;
        }

        const response = await getReports(filters, 100, 0);

        if (active) {
          setReport(response.data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat laporan");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-white px-6 py-8 font-sans text-slate-950 sm:px-10">
      <style>
        {`
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          @media print {
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }
            .print-section {
              break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
            tr {
              break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="no-print mx-auto mb-8 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <FileText className="size-6 text-indigo-600" />
          <div>
            <h1 className="text-lg font-bold">GoDesk Report Preview</h1>
            <p className="text-xs text-slate-500">
              Pratinjau laporan sebelum disimpan sebagai PDF.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/reports")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium"
          >
            <ArrowLeft className="size-4" />
            Kembali
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!report || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Printer className="size-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        {loading && (
          <p className="py-10 text-center text-sm text-slate-500">
            Memuat laporan...
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-300 p-4 text-sm text-red-600">
            {error}
          </p>
        )}

        {report && (
          <>
            <header className="mb-8 border-b-2 border-slate-900 pb-5">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold">GoDesk</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Ticket Management & Helpdesk System
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold">Reports & Analytics</h2>
                  <p className="mt-2 text-xs text-slate-500">
                    Dibuat: {formatDate(new Date().toISOString())}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
                <p>
                  <strong>Periode:</strong> {report.from} sampai {report.to}
                </p>
                <p>
                  <strong>Zona waktu:</strong> Asia/Makassar
                </p>
              </div>
            </header>

            <section className="print-section mb-6 rounded-lg border border-slate-300 p-5">
              <h2 className="mb-5 text-lg font-bold">Ringkasan Tiket</h2>

              <div className="grid grid-cols-4 gap-4">
                <SummaryCard
                  title="Total Tiket"
                  value={formatNumber(report.summary.total)}
                />
                <SummaryCard
                  title="Open"
                  value={formatNumber(report.summary.open)}
                />
                <SummaryCard
                  title="In Progress"
                  value={formatNumber(report.summary.in_progress)}
                />
                <SummaryCard
                  title="Resolved"
                  value={formatNumber(report.summary.resolved)}
                />
                <SummaryCard
                  title="Closed"
                  value={formatNumber(report.summary.closed)}
                />
                <SummaryCard
                  title="Pelanggan Unik"
                  value={formatNumber(report.summary.customers)}
                />
                <div className="col-span-2">
                  <SummaryCard
                    title="Rata-rata Penyelesaian"
                    value={`${report.summary.average_resolution_hours.toFixed(1)} jam`}
                  />
                </div>
              </div>
            </section>

            <section className="print-section mb-6 rounded-lg border border-slate-300 p-5">
              <h2 className="mb-5 text-lg font-bold">SLA Performance</h2>

              <div className="grid grid-cols-2 gap-5">
                <div className="rounded-lg bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold">First Response SLA</h3>
                  <p className="mt-3 text-2xl font-bold">
                    {report.sla.response_met + report.sla.response_breached ===
                    0
                      ? "Belum dinilai"
                      : `${report.sla.response_rate.toFixed(1)}%`}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Terpenuhi: {report.sla.response_met}
                  </p>
                  <p className="text-xs text-slate-500">
                    Terlambat: {report.sla.response_breached}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold">Resolution SLA</h3>
                  <p className="mt-3 text-2xl font-bold">
                    {report.sla.resolution_met +
                      report.sla.resolution_breached ===
                    0
                      ? "Belum dinilai"
                      : `${report.sla.resolution_rate.toFixed(1)}%`}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Terpenuhi: {report.sla.resolution_met}
                  </p>
                  <p className="text-xs text-slate-500">
                    Terlambat: {report.sla.resolution_breached}
                  </p>
                </div>
              </div>
            </section>

            <section className="print-section mb-6 rounded-lg border border-slate-300 p-5">
              <h2 className="mb-5 text-lg font-bold">Distribusi Tiket</h2>

              <div className="grid grid-cols-3 gap-6">
                <Distribution
                  title="Berdasarkan Status"
                  items={report.statuses}
                />
                <Distribution
                  title="Berdasarkan Prioritas"
                  items={report.priorities}
                />
                <Distribution
                  title="Berdasarkan Kategori"
                  items={report.categories}
                />
              </div>
            </section>

            <section className="print-section mb-6 rounded-lg border border-slate-300 p-5">
              <h2 className="mb-5 text-lg font-bold">Agent Performance</h2>

              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="p-2">Agent</th>
                    <th className="p-2">Total Tiket</th>
                    <th className="p-2">Selesai</th>
                    <th className="p-2">SLA Terpenuhi</th>
                    <th className="p-2">SLA Terlambat</th>
                  </tr>
                </thead>
                <tbody>
                  {report.agents.map((agent) => (
                    <tr key={agent.id} className="border-b border-slate-200">
                      <td className="p-2">{agent.name}</td>
                      <td className="p-2">{formatNumber(agent.total)}</td>
                      <td className="p-2">{formatNumber(agent.completed)}</td>
                      <td className="p-2">{formatNumber(agent.sla_met)}</td>
                      <td className="p-2">
                        {formatNumber(agent.sla_breached)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {report.agents.length === 0 && (
                <p className="mt-4 text-xs text-slate-500">
                  Belum ada data performa Agent.
                </p>
              )}
            </section>

            <section className="mb-6">
              <h2 className="mb-5 text-lg font-bold">Detail Tiket</h2>

              <table className="w-full border-collapse text-left text-[10px]">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="p-2">Nomor</th>
                    <th className="p-2">Subjek</th>
                    <th className="p-2">Kategori</th>
                    <th className="p-2">Agent</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Prioritas</th>
                    <th className="p-2">SLA Respons</th>
                    <th className="p-2">SLA Penyelesaian</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-slate-200">
                      <td className="p-2">{ticket.ticket_number}</td>
                      <td className="p-2">{ticket.subject}</td>
                      <td className="p-2">{ticket.category}</td>
                      <td className="p-2">{ticket.agent}</td>
                      <td className="p-2">{ticket.status}</td>
                      <td className="p-2">{ticket.priority}</td>
                      <td className="p-2">{ticket.sla_response}</td>
                      <td className="p-2">{ticket.sla_resolution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {report.tickets.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500">
                  Tidak ada tiket pada periode yang dipilih.
                </p>
              )}

              {report.total > 100 && (
                <p className="mt-4 text-xs text-slate-500">
                  Laporan PDF hanya menampilkan 100 tiket pertama dari total{" "}
                  {formatNumber(report.total)} tiket. Gunakan CSV untuk
                  mengekspor data lainnya.
                </p>
              )}
            </section>

            <footer className="mt-8 flex items-center justify-between border-t border-slate-300 pt-4 text-xs text-slate-500">
              <span>GoDesk — Ticket Management & Helpdesk System</span>
              <span>Reports & Analytics</span>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
