export type TicketActivityType =
  | "COMMENT"
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "STATUS_CHANGED"
  | "AGENT_ASSIGNED";

export type TicketTimelineKind =
  | "ACTIVITY"
  | "COMMENT";

export type TicketTimelineItem = {
  id: number;
  kind: TicketTimelineKind;
  type: TicketActivityType;

  actor_user_id: number | null;
  actor_name: string | null;
  actor_role: string | null;

  message: string;

  old_value: string | null;
  new_value: string | null;

  created_at: string;
};

export type TicketActivityResponse = {
  data: TicketTimelineItem[];
};

export type CreateCommentPayload = {
  body: string;
};

export type CreateCommentResponse = {
  message: string;
  data: TicketTimelineItem;
};