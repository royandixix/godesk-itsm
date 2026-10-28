package notification

import "time"

const (
	TypeAgentAssigned = "AGENT_ASSIGNED"
	TypeStatusChanged = "STATUS_CHANGED"
	TypeCommentAdded  = "COMMENT_ADDED"
	TypeSystem        = "SYSTEM"
)

type Notification struct {
	ID int64 `json:"id"`

	RecipientUserID int64 `json:"recipient_user_id"`

	ActorUserID *int64 `json:"actor_user_id"`

	ActorName *string `json:"actor_name"`

	TicketID *int64 `json:"ticket_id"`

	TicketNumber *string `json:"ticket_number"`

	Type string `json:"type"`

	Title string `json:"title"`

	Message string `json:"message"`

	IsRead bool `json:"is_read"`

	ReadAt *time.Time `json:"read_at"`

	CreatedAt time.Time `json:"created_at"`
}

type ListResult struct {
	Items []Notification `json:"items"`

	Total int64 `json:"total"`

	Limit int `json:"limit"`

	Offset int `json:"offset"`
}

type CreateInput struct {
	RecipientUserID int64

	ActorUserID *int64

	TicketID *int64

	Type string

	Title string

	Message string
}
