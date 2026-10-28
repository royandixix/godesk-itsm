export type TicketPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AgentSummary = {
  id: number;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
};

export type Ticket = {
  id: number;
  ticket_number: string;

  customer_id: number;
  customer_name: string;
  customer_email: string;

  assigned_agent_id: number | null;
  assigned_agent_name: string | null;

  category_id: number;
  category_name: string;
  category_slug: string;

  subject: string;
  description: string;

  priority: TicketPriority;
  status: TicketStatus;

  resolved_at: string | null;
  closed_at: string | null;

  created_at: string;
  updated_at: string;
};

export type TicketListResult = {
  items: Ticket[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateTicketPayload = {
  category_id: number;
  subject: string;
  description: string;
  priority: TicketPriority;
};

export type UpdateTicketPayload = {
  category_id?: number;
  subject?: string;
  description?: string;
  priority?: TicketPriority;
};

export type UpdateTicketStatusPayload = {
  status: TicketStatus;
};

export type AssignTicketPayload = {
  agent_id: number;
};

export type TicketListQuery = {
  status?: TicketStatus | "";
  priority?: TicketPriority | "";
  category_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
};

export type DataResponse<T> = {
  data: T;
};

export type MessageDataResponse<T> = {
  message: string;
  data: T;
};