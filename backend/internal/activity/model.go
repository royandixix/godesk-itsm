package activity

import "time"

const (
	TypeTicketCreated = "TICKET_CREATED"
	TypeTicketUpdated = "TICKET_UPDATED"
	TypeStatusChanged = "STATUS_CHANGED"
	TypeAgentAssigned = "AGENT_ASSIGNED"

	ItemKindActivity = "ACTIVITY"
	ItemKindComment  = "COMMENT"
)

type Actor struct {
	UserID int64
	Role   string
}

type TimelineItem struct {
	ID int64 `json:"id"`

	Kind string `json:"kind"`

	Type string `json:"type"`

	ActorUserID *int64 `json:"actor_user_id"`

	ActorName string `json:"actor_name"`

	ActorRole string `json:"actor_role"`

	Message string `json:"message"`

	OldValue *string `json:"old_value"`

	NewValue *string `json:"new_value"`

	CreatedAt time.Time `json:"created_at"`
}

type CreateCommentInput struct {
	Body string `json:"body"`
}

type ActivityRecord struct {
	TicketID int64

	ActorUserID *int64

	Type string

	Message string

	OldValue *string

	NewValue *string
}

type TicketNotificationContext struct {
	TicketID int64

	TicketNumber string

	CustomerID int64

	AssignedAgentID *int64
}
