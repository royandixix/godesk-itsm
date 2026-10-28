
import { apiFetch } from "@/lib/api/client";

export type ReportFilters = {
  from: string;
  to: string;
  status: string;
  priority: string;
  category_id: string;
  agent_id: string;
};

export type CountItem = {
  name: string;
  total: number;
};

export type AgentItem = {
  id: number;
  name: string;
  total: number;
  completed: number;
  sla_met: number;
  sla_breached: number;
};

export type TicketItem = {
  id: number;
  ticket_number: string;
  subject: string;
  category: string;
  customer: string;
  agent: string;
  status: string;
  priority: string;
  sla_response: string;
  sla_resolution: string;
  created_at: string;
};

export type ReportData = {
  from: string;
  to: string;
  summary: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    customers: number;
    average_resolution_hours: number;
  };
  trend: CountItem[];
  statuses: CountItem[];
  priorities: CountItem[];
  categories: CountItem[];
  agents: AgentItem[];
  sla: {
    response_met: number;
    response_breached: number;
    resolution_met: number;
    resolution_breached: number;
    response_rate: number;
    resolution_rate: number;
  };
  tickets: TicketItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ReportOptions = {
  categories: {
    id: number;
    name: string;
  }[];
  agents: {
    id: number;
    name: string;
  }[];
};

export function reportParams(
  filters: ReportFilters,
  limit = 20,
  offset = 0,
): string {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    limit: String(limit),
    offset: String(offset),
  });

  const keys: (keyof ReportFilters)[] = [
    "status",
    "priority",
    "category_id",
    "agent_id",
  ];

  for (const key of keys) {
    const value = filters[key];
    if (value) {
      params.set(key, value);
    }
  }

  return params.toString();
}

export function getReports(
  filters: ReportFilters,
  limit = 20,
  offset = 0,
) {
  return apiFetch<{ data: ReportData }>(
    `/reports?${reportParams(filters, limit, offset)}`,
    { errorAlert: false },
  );
}

export function getReportOptions() {
  return apiFetch<{ data: ReportOptions }>(
    "/reports/options",
    { errorAlert: false },
  );
}

export async function exportReportCSV(
  filters: ReportFilters,
): Promise<void> {
  const configuredBase =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8082";

  const base = configuredBase.replace(/\/+$/, "");

  const apiBase = base.endsWith("/api/v1")
    ? base
    : `${base}/api/v1`;

  const url = `${apiBase}/reports/export.csv?${reportParams(filters)}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "text/csv",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Gagal mengekspor laporan CSV";

    try {
      const result = await response.json();
      if (typeof result?.message === "string") {
        message = result.message;
      }
    } catch {
      message = `HTTP ${response.status}: ${response.statusText}`;
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = `godesk-reports-${filters.from}-${filters.to}.csv`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}
