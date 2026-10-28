package ticket

import "time"

type Priority string

const (
	PriorityLow    Priority = "LOW"
	PriorityMedium Priority = "MEDIUM"
	PriorityHigh   Priority = "HIGH"
	PriorityUrgent Priority = "URGENT"
)

type Status string

const (
	StatusOpen       Status = "OPEN"
	StatusInProgress Status = "IN_PROGRESS"
	StatusResolved   Status = "RESOLVED"
	StatusClosed     Status = "CLOSED"
)

type Actor struct {
	UserID int64
	Role   string
}

type Ticket struct {
	ID              int64      `json:"id"`
	TicketNumber    string     `json:"ticket_number"`
	CustomerID      int64      `json:"customer_id"`
	CustomerName    string     `json:"customer_name"`
	CustomerEmail   string     `json:"customer_email"`
	AssignedAgentID *int64     `json:"assigned_agent_id"`
	AssignedAgent   *string    `json:"assigned_agent_name"`
	CategoryID      int64      `json:"category_id"`
	CategoryName    string     `json:"category_name"`
	CategorySlug    string     `json:"category_slug"`
	Subject         string     `json:"subject"`
	Description     string     `json:"description"`
	Priority        Priority   `json:"priority"`
	Status          Status     `json:"status"`
	ResolvedAt      *time.Time `json:"resolved_at"`
	ClosedAt        *time.Time `json:"closed_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type CreateInput struct {
	CategoryID  int64    `json:"category_id"`
	Subject     string   `json:"subject"`
	Description string   `json:"description"`
	Priority    Priority `json:"priority"`
}

type UpdateInput struct {
	CategoryID  *int64    `json:"category_id,omitempty"`
	Subject     *string   `json:"subject,omitempty"`
	Description *string   `json:"description,omitempty"`
	Priority    *Priority `json:"priority,omitempty"`
}

type UpdateStatusInput struct {
	Status Status `json:"status"`
}

type AssignInput struct {
	AgentID int64 `json:"agent_id"`
}

type ListFilter struct {
	Status     string
	Priority   string
	CategoryID int64
	Search     string
	Limit      int
	Offset     int
}

type ListResult struct {
	Items  []Ticket `json:"items"`
	Total  int64    `json:"total"`
	Limit  int      `json:"limit"`
	Offset int      `json:"offset"`
}

type AgentInfo struct {
	ID     int64
	Name   string
	Email  string
	Role   string
	Status string
}
