package sla

import "time"

type Policy struct {
	Priority             string    `json:"priority"`
	FirstResponseMinutes int       `json:"first_response_minutes"`
	ResolutionMinutes    int       `json:"resolution_minutes"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type Target struct {
	DueAt       time.Time  `json:"due_at"`
	CompletedAt *time.Time `json:"completed_at"`
	Met         *bool      `json:"met"`
	Status      string     `json:"status"`
}

type TicketSLA struct {
	TicketID      int64  `json:"ticket_id"`
	Priority      string `json:"priority"`
	FirstResponse Target `json:"first_response"`
	Resolution    Target `json:"resolution"`
}

type TicketSummary struct {
	ID               int64     `json:"id"`
	TicketNumber     string    `json:"ticket_number"`
	Subject          string    `json:"subject"`
	Priority         string    `json:"priority"`
	TicketStatus     string    `json:"ticket_status"`
	AgentName        *string   `json:"agent_name"`
	ResponseStatus   string    `json:"response_status"`
	ResolutionStatus string    `json:"resolution_status"`
	ResponseDueAt    time.Time `json:"response_due_at"`
	ResolutionDueAt  time.Time `json:"resolution_due_at"`
}

type TicketList struct {
	Items  []TicketSummary `json:"items"`
	Total  int64           `json:"total"`
	Limit  int             `json:"limit"`
	Offset int             `json:"offset"`
}

type Overview struct {
	TotalTickets       int64 `json:"total_tickets"`
	ResponseBreached   int64 `json:"response_breached"`
	ResolutionBreached int64 `json:"resolution_breached"`
	ResponseMet        int64 `json:"response_met"`
	ResolutionMet      int64 `json:"resolution_met"`
	AtRisk             int64 `json:"at_risk"`
}

func validPolicyMinutes(response, resolution int) bool {
	return response >= 1 &&
		response <= 525600 &&
		resolution >= response &&
		resolution <= 525600
}

func validStatusFilter(filter string) bool {
	switch filter {
	case "ALL", "BREACHED", "AT_RISK", "ON_TRACK", "MET":
		return true
	default:
		return false
	}
}

func status(
	due time.Time,
	completed *time.Time,
	met *bool,
	now time.Time,
	start time.Time,
) string {
	if completed != nil {
		if met != nil && *met {
			return "MET"
		}
		return "BREACHED"
	}

	if !now.Before(due) {
		return "BREACHED"
	}

	budget := due.Sub(start)

	if budget > 0 && due.Sub(now) <= budget/5 {
		return "AT_RISK"
	}

	return "ON_TRACK"
}
