package knowledge

import "time"

type Status string

const (
	StatusDraft     Status = "DRAFT"
	StatusPublished Status = "PUBLISHED"
)

type Actor struct {
	UserID int64
	Role   string
}

type Article struct {
	ID int64 `json:"id"`

	CategoryID   *int64 `json:"category_id"`
	CategoryName string `json:"category_name"`

	AuthorID   int64  `json:"author_id"`
	AuthorName string `json:"author_name"`

	Slug string `json:"slug"`

	Title   string `json:"title"`
	Summary string `json:"summary"`
	Content string `json:"content"`

	Status Status `json:"status"`

	PublishedAt *time.Time `json:"published_at"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ListFilter struct {
	Search string

	CategoryID *int64

	Status Status
}

type CreateInput struct {
	CategoryID *int64 `json:"category_id"`

	Title string `json:"title"`

	Summary string `json:"summary"`

	Content string `json:"content"`

	Status Status `json:"status"`
}

type UpdateInput struct {
	CategoryID *int64 `json:"category_id"`

	Title *string `json:"title"`

	Summary *string `json:"summary"`

	Content *string `json:"content"`

	Status *Status `json:"status"`
}
