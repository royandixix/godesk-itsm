package dashboard

import "time"

type Actor struct {
	UserID int64
	Role   string
}

type Stats struct {
	Total      int64 `json:"total"`
	Open       int64 `json:"open"`
	InProgress int64 `json:"in_progress"`
	Resolved   int64 `json:"resolved"`
	Closed     int64 `json:"closed"`
	Customers  int64 `json:"customers"`
}

type PriorityStats struct {
	Low    int64 `json:"low"`
	Medium int64 `json:"medium"`
	High   int64 `json:"high"`
	Urgent int64 `json:"urgent"`
}

type MonthlyItem struct {
	Month int   `json:"month"`
	Total int64 `json:"total"`
}

type RecentTicket struct {
	ID           int64     `json:"id"`
	TicketNumber string    `json:"ticket_number"`
	Subject      string    `json:"subject"`
	CustomerName string    `json:"customer_name"`
	CategoryName string    `json:"category_name"`
	Priority     string    `json:"priority"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

type Data struct {
	Role          string         `json:"role"`
	Year          int            `json:"year"`
	Stats         Stats          `json:"stats"`
	Priorities    PriorityStats  `json:"priorities"`
	Monthly       []MonthlyItem  `json:"monthly"`
	RecentTickets []RecentTicket `json:"recent_tickets"`
}
