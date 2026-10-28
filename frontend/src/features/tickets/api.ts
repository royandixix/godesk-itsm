import {
  apiFetch,
} from "@/lib/api/client";

import type {
  AgentSummary,
  AssignTicketPayload,
  Category,
  CreateTicketPayload,
  DataResponse,
  MessageDataResponse,
  Ticket,
  TicketListQuery,
  TicketListResult,
  UpdateTicketPayload,
  UpdateTicketStatusPayload,
} from "@/lib/types/ticket";

export function getCategories() {
  return apiFetch<
    DataResponse<Category[]>
  >(
    "/categories",
    {
      errorAlert:
        false,
    },
  );
}

export function getAgents() {
  return apiFetch<
    DataResponse<AgentSummary[]>
  >(
    "/agents",
    {
      errorAlert:
        false,
    },
  );
}

export function getTickets(
  query: TicketListQuery = {},
) {
  const params =
    new URLSearchParams();

  if (
    query.status
  ) {
    params.set(
      "status",
      query.status,
    );
  }

  if (
    query.priority
  ) {
    params.set(
      "priority",
      query.priority,
    );
  }

  if (
    query.category_id
  ) {
    params.set(
      "category_id",
      String(
        query.category_id,
      ),
    );
  }

  if (
    query.search
  ) {
    params.set(
      "search",
      query.search,
    );
  }

  if (
    query.limit
  ) {
    params.set(
      "limit",
      String(
        query.limit,
      ),
    );
  }

  if (
    query.offset !==
    undefined
  ) {
    params.set(
      "offset",
      String(
        query.offset,
      ),
    );
  }

  const queryString =
    params.toString();

  return apiFetch<
    DataResponse<TicketListResult>
  >(
    `/tickets${
      queryString
        ? `?${queryString}`
        : ""
    }`,
    {
      errorAlert:
        false,
    },
  );
}

export function getTicket(
  id: number,
) {
  return apiFetch<
    DataResponse<Ticket>
  >(
    `/tickets/${id}`,
    {
      errorAlert:
        false,
    },
  );
}

export function createTicket(
  payload:
    CreateTicketPayload,
) {
  return apiFetch<
    MessageDataResponse<Ticket>
  >(
    "/tickets",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

export function updateTicket(
  id: number,
  payload:
    UpdateTicketPayload,
) {
  return apiFetch<
    MessageDataResponse<Ticket>
  >(
    `/tickets/${id}`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

export function updateTicketStatus(
  id: number,
  payload:
    UpdateTicketStatusPayload,
) {
  return apiFetch<
    MessageDataResponse<Ticket>
  >(
    `/tickets/${id}/status`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

export function assignTicket(
  id: number,
  payload:
    AssignTicketPayload,
) {
  return apiFetch<
    MessageDataResponse<Ticket>
  >(
    `/tickets/${id}/assign`,
    {
      method:
        "PATCH",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

export function deleteTicket(
  id: number,
) {
  return apiFetch<{
    message: string;
  }>(
    `/tickets/${id}`,
    {
      method:
        "DELETE",
    },
  );
}