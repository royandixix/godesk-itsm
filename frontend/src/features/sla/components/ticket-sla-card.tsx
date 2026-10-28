"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, RefreshCcw } from "lucide-react";
import {
  getTicketSla,
  type SlaStatus,
  type SlaTarget,
  type TicketSla,
} from "@/features/sla/api";

type Language = "id" | "en";

interface TicketSlaCardProps {
  ticketId: number;
  updatedAt: string;
  language: Language;
}

const statusColors: Record<SlaStatus, string> = {
  MET: "bg-emerald-100 text-emerald-700",
  ON_TRACK: "bg-blue-100 text-blue-700",
  AT_RISK: "bg-amber-100 text-amber-700",
  BREACHED: "bg-red-100 text-red-700",
};

const statusLabels: Record<SlaStatus, string> = {
  MET: "Terpenuhi",
  ON_TRACK: "Sesuai Target",
  AT_RISK: "Hampir Terlambat",
  BREACHED: "Terlambat",
};

function formatDate(value: string, language: Language) {
  return new Date(value).toLocaleString(
    language === "id" ? "id-ID" : "en-US",
    { dateStyle: "medium", timeStyle: "short" },
  );
}

function TargetRow({
  title,
  target,
  language,
}: {
  title: string;
  target: SlaTarget;
  language: Language;
}) {
  return (
    <div className="border-t border-slate-200 py-4 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[target.status]}`}>
          {statusLabels[target.status]}
        </span>
      </div>
      <div className="mt-3 space-y-2 text-xs text-slate-500">
        <p>Batas: {formatDate(target.due_at, language)}</p>
        {target.completed_at && (
          <p>Selesai: {formatDate(target.completed_at, language)}</p>
        )}
      </div>
    </div>
  );
}

export default function TicketSlaCard({
  ticketId,
  updatedAt,
  language,
}: TicketSlaCardProps) {
  const [sla, setSla] = useState<TicketSla | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSla = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getTicketSla(ticketId);
      setSla(response.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data SLA");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    let active = true;

    const refresh = () => {
      void getTicketSla(ticketId)
        .then((response) => {
          if (!active) return;
          setSla(response.data);
          setError("");
        })
        .catch((err: unknown) => {
          if (active) {
            setError(err instanceof Error ? err.message : "Gagal mengambil data SLA");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    refresh();
    const interval = window.setInterval(refresh, 60000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [ticketId, updatedAt]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock3 className="size-5 text-blue-500" />
          <h3 className="text-sm font-bold">SLA Management</h3>
        </div>
        <button
          type="button"
          onClick={() => void loadSla()}
          aria-label="Refresh SLA"
          className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {loading && !sla && (
        <p className="mt-4 text-sm text-slate-500">Memuat informasi SLA...</p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>
      )}
      {sla && (
        <div className="mt-4">
          <TargetRow title="First Response" target={sla.first_response} language={language} />
          <TargetRow title="Resolution Time" target={sla.resolution} language={language} />
          <p className="mt-3 text-xs text-slate-500">
            SLA dihitung otomatis berdasarkan prioritas tiket.
            Target waktu berlaku 24 jam setiap hari.
          </p>
        </div>
      )}
    </section>
  );
}
