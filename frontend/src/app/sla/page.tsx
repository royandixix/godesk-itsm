
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock3,
  RefreshCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

import AppShell from "@/components/app-shell";
import { getMe } from "@/features/auth/api";

import {
  getSlaOverview,
  getSlaPolicies,
  getSlaTickets,
  updateSlaPolicy,
  type SlaOverview,
  type SlaPolicy,
  type SlaTicketList,
  type SlaFilter,
  type SlaStatus,
} from "@/features/sla/api";

type Role = "SUPER_ADMIN" | "MANAGER";

const PAGE_SIZE = 10;

const statusLabels: Record<SlaStatus, string> = {
  MET: "Terpenuhi",
  BREACHED: "Terlambat",
  AT_RISK: "Hampir terlambat",
  ON_TRACK: "Sesuai target",
};

const statusColors: Record<SlaStatus, string> = {
  MET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  BREACHED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  AT_RISK: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ON_TRACK: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

function StatusBadge({ status }: { status: SlaStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} menit`;

  const hours = minutes / 60;

  return Number.isInteger(hours)
    ? `${hours} jam`
    : `${minutes} menit`;
}

export default function SlaPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [overview, setOverview] = useState<SlaOverview | null>(null);
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [tickets, setTickets] = useState<SlaTicketList | null>(null);

  const [filter, setFilter] = useState<SlaFilter>("ALL");
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const me = await getMe();

      if (
        me.data.role !== "SUPER_ADMIN" &&
        me.data.role !== "MANAGER"
      ) {
        router.replace("/dashboard");
        return;
      }

      setRole(me.data.role);

      const [overviewResponse, policiesResponse] =
        await Promise.all([
          getSlaOverview(),
          getSlaPolicies(),
        ]);

      setOverview(overviewResponse.data);
      setPolicies(policiesResponse.data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat dashboard SLA",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadTickets = useCallback(async () => {
    try {
      const result = await getSlaTickets(
        filter,
        PAGE_SIZE,
        page * PAGE_SIZE,
      );

      setTickets(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat tiket",
      );
    } finally {
      setLoadingTickets(false);
    }
  }, [filter, page]);

  useEffect(() => {
    let active = true;
    void getMe()
      .then(async (me) => {
        if (!active) return;
        if (me.data.role !== "SUPER_ADMIN" && me.data.role !== "MANAGER") {
          router.replace("/dashboard");
          return;
        }
        setRole(me.data.role);
        const responses = await Promise.all([getSlaOverview(), getSlaPolicies()]);
        if (!active) return;
        setOverview(responses[0].data);
        setPolicies(responses[1].data);
        setError("");
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat dashboard SLA");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (role === null) return;
    let active = true;
    void getSlaTickets(filter, PAGE_SIZE, page * PAGE_SIZE)
      .then((result) => {
        if (active) setTickets(result.data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat tiket");
      })
      .finally(() => {
        if (active) setLoadingTickets(false);
      });
    return () => {
      active = false;
    };
  }, [role, filter, page]);

  function handleRefreshSla() {
    setLoading(true);
    setLoadingTickets(true);
    setError("");
    void loadDashboard();
    void loadTickets();
  }

  function changePolicy(
    priority: SlaPolicy["priority"],
    field: "first_response_minutes" | "resolution_minutes",
    value: string,
  ) {
    setPolicies((current) =>
      current.map((policy) =>
        policy.priority === priority
          ? {
              ...policy,
              [field]: value === "" ? 0 : Number(value),
            }
          : policy,
      ),
    );
  }

  async function savePolicy(policy: SlaPolicy) {
    const response = policy.first_response_minutes;
    const resolution = policy.resolution_minutes;

    if (
      !Number.isInteger(response) ||
      !Number.isInteger(resolution) ||
      response < 1 ||
      resolution < response ||
      resolution > 525600
    ) {
      setError("Durasi SLA tidak valid.");
      return;
    }

    setSaving(policy.priority);
    setError("");
    setMessage("");

    try {
      const result = await updateSlaPolicy(
        policy.priority,
        {
          first_response_minutes: response,
          resolution_minutes: resolution,
        },
      );

      setPolicies((current) =>
        current.map((item) =>
          item.priority === policy.priority
            ? result.data
            : item,
        ),
      );

      setMessage(
        `Kebijakan ${policy.priority} berhasil disimpan.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan kebijakan SLA",
      );
    } finally {
      setSaving(null);
    }
  }

  const stats = overview
    ? [
        ["Total Tiket", overview.total_tickets],
        ["Respons Terlambat", overview.response_breached],
        ["Penyelesaian Terlambat", overview.resolution_breached],
        ["Berisiko Terlambat", overview.at_risk],
        ["Respons Tepat Waktu", overview.response_met],
        ["Penyelesaian Tepat Waktu", overview.resolution_met],
      ]
    : [];

  const totalPages = tickets
    ? Math.max(1, Math.ceil(tickets.total / PAGE_SIZE))
    : 1;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="size-4" />
              GoDesk / Management
            </div>

            <h1 className="text-2xl font-bold tracking-tight">
              SLA Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Pantau target waktu respons dan penyelesaian tiket.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshSla}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            <RefreshCcw className="size-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-red-300 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="mb-5 rounded-lg border border-emerald-300 p-3 text-sm text-emerald-600">
            {message}
          </div>
        )}

        {loading && (
          <p className="mb-5 text-sm text-slate-500">
            Memuat data SLA...
          </p>
        )}

        {overview && (
          <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#020617]"
              >
                <p className="text-xs font-medium text-slate-500">
                  {label}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-3xl font-bold">{value}</p>
                  <Clock3 className="size-5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}

        {role && (
          <section className="mb-7 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#020617]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  Monitoring Tiket SLA
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Tiket terlambat ditampilkan lebih dahulu.
                </p>
              </div>

              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value as SlaFilter);
                  setPage(0);
                }}
                className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
              >
                <option value="ALL">Semua status</option>
                <option value="BREACHED">Terlambat</option>
                <option value="AT_RISK">Hampir terlambat</option>
                <option value="ON_TRACK">Sesuai target</option>
                <option value="MET">Terpenuhi</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-700">
                  <tr>
                    <th className="pb-3">Tiket</th>
                    <th className="pb-3">Prioritas</th>
                    <th className="pb-3">Agent</th>
                    <th className="pb-3">Respons</th>
                    <th className="pb-3">Penyelesaian</th>
                  </tr>
                </thead>

                <tbody>
                  {tickets?.items.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-4 pr-4">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="font-semibold hover:underline"
                        >
                          {ticket.ticket_number}
                        </Link>

                        <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                          {ticket.subject}
                        </p>
                      </td>

                      <td className="py-4">
                        {ticket.priority}
                      </td>

                      <td className="py-4">
                        {ticket.agent_name ?? "Belum ditugaskan"}
                      </td>

                      <td className="py-4">
                        <StatusBadge
                          status={ticket.response_status}
                        />
                      </td>

                      <td className="py-4">
                        <StatusBadge
                          status={ticket.resolution_status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loadingTickets && tickets?.items.length === 0 && (
                <p className="py-7 text-center text-sm text-slate-500">
                  Tidak ada tiket yang sesuai dengan filter.
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 text-sm">
              <p className="text-xs text-slate-500">
                Halaman {page + 1} dari {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0 || loadingTickets}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border px-3 py-2 disabled:opacity-40"
                >
                  Sebelumnya
                </button>

                <button
                  type="button"
                  disabled={page + 1 >= totalPages || loadingTickets}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border px-3 py-2 disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </section>
        )}

        {role && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#020617]">
            <div className="mb-5">
              <h2 className="font-semibold">
                SLA Policy Configuration
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Perubahan target berlaku pada tiket baru dan
                tiket yang mengalami perubahan prioritas.
              </p>
            </div>

            <div className="space-y-4">
              {policies.map((policy) => (
                <div
                  key={policy.priority}
                  className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-[140px_1fr_1fr_auto] md:items-end"
                >
                  <div>
                    <p className="text-xs text-slate-500">
                      Prioritas
                    </p>

                    <p className="mt-2 font-semibold">
                      {policy.priority}
                    </p>
                  </div>

                  <label className="text-xs font-medium">
                    First Response (menit)

                    <input
                      type="number"
                      min={1}
                      max={525600}
                      value={policy.first_response_minutes}
                      disabled={role !== "SUPER_ADMIN"}
                      onChange={(e) =>
                        changePolicy(
                          policy.priority,
                          "first_response_minutes",
                          e.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                    />
                  </label>

                  <label className="text-xs font-medium">
                    Resolution (menit)

                    <input
                      type="number"
                      min={1}
                      max={525600}
                      value={policy.resolution_minutes}
                      disabled={role !== "SUPER_ADMIN"}
                      onChange={(e) =>
                        changePolicy(
                          policy.priority,
                          "resolution_minutes",
                          e.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                    />
                  </label>

                  {role === "SUPER_ADMIN" ? (
                    <button
                      type="button"
                      disabled={saving !== null}
                      onClick={() => void savePolicy(policy)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                    >
                      <Save className="size-4" />
                      {saving === policy.priority
                        ? "Menyimpan..."
                        : "Simpan"}
                    </button>
                  ) : (
                    <p className="pb-2 text-xs text-slate-500">
                      Hanya baca
                    </p>
                  )}

                  <p className="text-xs text-slate-500 md:col-span-4">
                    Respons:{" "}
                    {formatMinutes(policy.first_response_minutes)}
                    {" · "}
                    Penyelesaian:{" "}
                    {formatMinutes(policy.resolution_minutes)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
