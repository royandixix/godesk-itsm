package user

import "time"

const (
	RoleSuperAdmin = "SUPER_ADMIN"
	RoleManager    = "MANAGER"
	RoleAgent      = "AGENT"
	RoleCustomer   = "CUSTOMER"

	StatusActive   = "ACTIVE"
	StatusInactive = "INACTIVE"
)

type User struct {
	ID        int64     `json:"id"`
	RoleID    int64     `json:"-"`
	RoleCode  string    `json:"role"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	PasswordHash string `json:"-"`
}

type AgentSummary struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Status string `json:"status"`
}

type ListFilter struct {
	Role   string
	Status string
	Search string
	Limit  int
	Offset int
}

type ListResult struct {
	Items  []User `json:"items"`
	Total  int64  `json:"total"`
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
}
