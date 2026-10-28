package reports

import "time"

type Filter struct {
	From        time.Time
	ToExclusive time.Time
	FromDate    string
	ToDate      string
	Status      string
	Priority    string
	CategoryID  int64
	AgentID     int64
	Limit       int
	Offset      int
}

type Summary struct {
	Total                  int64   `json:"total"`
	Open                   int64   `json:"open"`
	InProgress             int64   `json:"in_progress"`
	Resolved               int64   `json:"resolved"`
	Closed                 int64   `json:"closed"`
	Customers              int64   `json:"customers"`
	AverageResolutionHours float64 `json:"average_resolution_hours"`
}

type CountItem struct {
	Name  string `json:"name"`
	Total int64  `json:"total"`
}

type AgentItem struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Total       int64  `json:"total"`
	Completed   int64  `json:"completed"`
	SlaMet      int64  `json:"sla_met"`
	SlaBreached int64  `json:"sla_breached"`
}

type SLA struct {
	ResponseMet        int64   `json:"response_met"`
	ResponseBreached   int64   `json:"response_breached"`
	ResolutionMet      int64   `json:"resolution_met"`
	ResolutionBreached int64   `json:"resolution_breached"`
	ResponseRate       float64 `json:"response_rate"`
	ResolutionRate     float64 `json:"resolution_rate"`
}

type TicketItem struct {
	ID            int64     `json:"id"`
	Number        string    `json:"ticket_number"`
	Subject       string    `json:"subject"`
	Category      string    `json:"category"`
	Customer      string    `json:"customer"`
	Agent         string    `json:"agent"`
	Status        string    `json:"status"`
	Priority      string    `json:"priority"`
	SlaResponse   string    `json:"sla_response"`
	SlaResolution string    `json:"sla_resolution"`
	CreatedAt     time.Time `json:"created_at"`
}

type Data struct {
	From       string       `json:"from"`
	To         string       `json:"to"`
	Summary    Summary      `json:"summary"`
	Trend      []CountItem  `json:"trend"`
	Statuses   []CountItem  `json:"statuses"`
	Priorities []CountItem  `json:"priorities"`
	Categories []CountItem  `json:"categories"`
	Agents     []AgentItem  `json:"agents"`
	SLA        SLA          `json:"sla"`
	Tickets    []TicketItem `json:"tickets"`
	Total      int64        `json:"total"`
	Limit      int          `json:"limit"`
	Offset     int          `json:"offset"`
}

type Option struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type Options struct {
	Categories []Option `json:"categories"`
	Agents     []Option `json:"agents"`
}
