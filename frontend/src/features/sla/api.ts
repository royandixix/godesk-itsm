
import { apiFetch } from "@/lib/api/client";

export type SlaPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type SlaStatus = "MET" | "BREACHED" | "AT_RISK" | "ON_TRACK";
export type SlaFilter = SlaStatus | "ALL";

export interface SlaPolicy {
  priority: SlaPriority;
  first_response_minutes: number;
  resolution_minutes: number;
  updated_at: string;
}

export interface SlaTarget {
  due_at: string;
  completed_at: string | null;
  met: boolean | null;
  status: SlaStatus;
}

export interface TicketSla {
  ticket_id: number;
  priority: SlaPriority;
  first_response: SlaTarget;
  resolution: SlaTarget;
}

export interface SlaOverview {
  total_tickets: number;
  response_breached: number;
  resolution_breached: number;
  response_met: number;
  resolution_met: number;
  at_risk: number;
}

export interface SlaTicketSummary {
  id: number;
  ticket_number: string;
  subject: string;
  priority: SlaPriority;
  ticket_status: string;
  agent_name: string | null;
  response_status: SlaStatus;
  resolution_status: SlaStatus;
  response_due_at: string;
  resolution_due_at: string;
}

export interface SlaTicketList {
  items: SlaTicketSummary[];
  total: number;
  limit: number;
  offset: number;
}

export function getTicketSla(id: number) {
  return apiFetch<{ data: TicketSla }>(
    `/tickets/${id}/sla`,
    { errorAlert: false },
  );
}

export function getSlaOverview() {
  return apiFetch<{ data: SlaOverview }>(
    "/sla/overview",
    { errorAlert: false },
  );
}

export function getSlaPolicies() {
  return apiFetch<{ data: SlaPolicy[] }>(
    "/sla/policies",
    { errorAlert: false },
  );
}

export function getSlaTickets(
  status: SlaFilter = "ALL",
  limit = 10,
  offset = 0,
) {
  const params = new URLSearchParams({
    status,
    limit: String(limit),
    offset: String(offset),
  });

  return apiFetch<{ data: SlaTicketList }>(
    `/sla/tickets?${params.toString()}`,
    { errorAlert: false },
  );
}

export function updateSlaPolicy(
  priority: SlaPriority,
  data: Pick<
    SlaPolicy,
    "first_response_minutes" | "resolution_minutes"
  >,
) {
  return apiFetch<{
    message: string;
    data: SlaPolicy;
  }>(
    `/admin/sla/policies/${priority}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      errorAlert: false,
    },
  );
}
