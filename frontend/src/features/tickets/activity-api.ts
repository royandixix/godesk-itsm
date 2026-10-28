import { apiFetch } from "@/lib/api/client";

import type {
  CreateCommentPayload,
  CreateCommentResponse,
  TicketActivityResponse,
} from "@/lib/types/activity";

export function getTicketActivity(ticketId: number) {
  return apiFetch<TicketActivityResponse>(`/tickets/${ticketId}/activity`, {
    errorAlert: false,
  });
}

export function createTicketComment(
  ticketId: number,
  payload: CreateCommentPayload,
) {
  return apiFetch<CreateCommentResponse>(`/tickets/${ticketId}/comments`, {
    method: "POST",

    body: JSON.stringify(payload),

    errorAlert: false,
  });
}
