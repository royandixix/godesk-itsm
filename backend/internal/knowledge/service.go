package knowledge

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/royandixix/godesk/backend/internal/user"
)

var (
	ErrForbidden = errors.New(
		"Anda tidak memiliki akses untuk melakukan tindakan ini",
	)

	ErrInvalidInput = errors.New(
		"data artikel knowledge base tidak valid",
	)
)

var slugPattern = regexp.MustCompile(
	`[^a-z0-9]+`,
)

type Service struct {
	repository *Repository
}

func NewService(
	repository *Repository,
) *Service {
	return &Service{
		repository: repository,
	}
}

func (s *Service) List(
	ctx context.Context,
	actor Actor,
	filter ListFilter,
) ([]Article, error) {
	filter.Search =
		strings.TrimSpace(
			filter.Search,
		)

	if filter.CategoryID != nil &&
		*filter.CategoryID <= 0 {
		return nil,
			ErrInvalidInput
	}

	if filter.Status != "" &&
		!isValidStatus(
			filter.Status,
		) {
		return nil,
			ErrInvalidInput
	}

	return s.repository.List(
		ctx,
		filter,
		canManage(
			actor,
		),
	)
}

func (s *Service) GetByID(
	ctx context.Context,
	actor Actor,
	id int64,
) (*Article, error) {
	if id <= 0 {
		return nil,
			ErrInvalidInput
	}

	item, err :=
		s.repository.FindByID(
			ctx,
			id,
		)

	if err != nil {
		return nil,
			err
	}

	if !canManage(actor) &&
		item.Status !=
			StatusPublished {
		return nil,
			ErrNotFound
	}

	return item,
		nil
}

func (s *Service) Create(
	ctx context.Context,
	actor Actor,
	input CreateInput,
) (*Article, error) {
	if !canManage(actor) {
		return nil,
			ErrForbidden
	}

	title :=
		strings.TrimSpace(
			input.Title,
		)

	summary :=
		strings.TrimSpace(
			input.Summary,
		)

	content :=
		strings.TrimSpace(
			input.Content,
		)

	status :=
		input.Status

	if status == "" {
		status =
			StatusDraft
	}

	if err :=
		validateArticle(
			title,
			summary,
			content,
			status,
		); err != nil {
		return nil,
			err
	}

	if err :=
		s.validateCategory(
			ctx,
			input.CategoryID,
		); err != nil {
		return nil,
			err
	}

	slug, err :=
		s.generateUniqueSlug(
			ctx,
			title,
			0,
		)
	if err != nil {
		return nil,
			err
	}

	var publishedAt *time.Time

	if status ==
		StatusPublished {
		now := time.Now()

		publishedAt =
			&now
	}

	return s.repository.Create(
		ctx,
		actor.UserID,
		input.CategoryID,
		slug,
		title,
		summary,
		content,
		status,
		publishedAt,
	)
}

func (s *Service) Update(
	ctx context.Context,
	actor Actor,
	id int64,
	input UpdateInput,
) (*Article, error) {
	if !canManage(actor) {
		return nil,
			ErrForbidden
	}

	if id <= 0 {
		return nil,
			ErrInvalidInput
	}

	current, err :=
		s.repository.FindByID(
			ctx,
			id,
		)
	if err != nil {
		return nil,
			err
	}

	categoryID :=
		current.CategoryID

	if input.ClearCategory {
		categoryID = nil
	} else if input.CategoryID != nil {
		categoryID =
			input.CategoryID
	}

	title :=
		current.Title

	if input.Title != nil {
		title =
			strings.TrimSpace(
				*input.Title,
			)
	}

	summary :=
		current.Summary

	if input.Summary != nil {
		summary =
			strings.TrimSpace(
				*input.Summary,
			)
	}

	content :=
		current.Content

	if input.Content != nil {
		content =
			strings.TrimSpace(
				*input.Content,
			)
	}

	status :=
		current.Status

	if input.Status != nil {
		status =
			*input.Status
	}

	if err :=
		validateArticle(
			title,
			summary,
			content,
			status,
		); err != nil {
		return nil,
			err
	}

	if err :=
		s.validateCategory(
			ctx,
			categoryID,
		); err != nil {
		return nil,
			err
	}

	slug :=
		current.Slug

	if title !=
		current.Title {
		slug, err =
			s.generateUniqueSlug(
				ctx,
				title,
				id,
			)
		if err != nil {
			return nil,
				err
		}
	}

	publishedAt :=
		current.PublishedAt

	if status ==
		StatusPublished &&
		publishedAt == nil {
		now := time.Now()

		publishedAt =
			&now
	}

	if status ==
		StatusDraft {
		publishedAt =
			nil
	}

	return s.repository.Update(
		ctx,
		id,
		categoryID,
		slug,
		title,
		summary,
		content,
		status,
		publishedAt,
	)
}

func (s *Service) Delete(
	ctx context.Context,
	actor Actor,
	id int64,
) error {
	if !canManage(actor) {
		return ErrForbidden
	}

	if id <= 0 {
		return ErrInvalidInput
	}

	return s.repository.Delete(
		ctx,
		id,
	)
}

func (s *Service) validateCategory(
	ctx context.Context,
	categoryID *int64,
) error {
	if categoryID == nil {
		return nil
	}

	if *categoryID <= 0 {
		return ErrInvalidInput
	}

	exists, err :=
		s.repository.CategoryExists(
			ctx,
			*categoryID,
		)

	if err != nil {
		return err
	}

	if !exists {
		return ErrCategoryNotFound
	}

	return nil
}

func (s *Service) generateUniqueSlug(
	ctx context.Context,
	title string,
	excludeID int64,
) (string, error) {
	base :=
		slugify(
			title,
		)

	if base == "" {
		base =
			"article"
	}

	if len(base) > 150 {
		base =
			strings.Trim(
				base[:150],
				"-",
			)
	}

	for attempt := 1; attempt <= 1000; attempt++ {
		candidate :=
			base

		if attempt > 1 {
			candidate =
				fmt.Sprintf(
					"%s-%s",
					base,
					strconv.Itoa(
						attempt,
					),
				)
		}

		exists, err :=
			s.repository.SlugExists(
				ctx,
				candidate,
				excludeID,
			)

		if err != nil {
			return "",
				err
		}

		if !exists {
			return candidate,
				nil
		}
	}

	return "",
		errors.New(
			"gagal membuat slug unik untuk artikel",
		)
}

func validateArticle(
	title string,
	summary string,
	content string,
	status Status,
) error {
	if len(title) < 5 ||
		len(title) > 200 {
		return ErrInvalidInput
	}

	if len(summary) > 500 {
		return ErrInvalidInput
	}

	if len(content) < 10 ||
		len(content) > 50000 {
		return ErrInvalidInput
	}

	if !isValidStatus(
		status,
	) {
		return ErrInvalidInput
	}

	return nil
}

func isValidStatus(
	status Status,
) bool {
	switch status {
	case StatusDraft,
		StatusPublished:
		return true

	default:
		return false
	}
}

func canManage(
	actor Actor,
) bool {
	switch actor.Role {
	case user.RoleSuperAdmin,
		user.RoleManager,
		user.RoleAgent:
		return true

	default:
		return false
	}
}

func slugify(
	value string,
) string {
	value =
		strings.ToLower(
			strings.TrimSpace(
				value,
			),
		)

	value =
		slugPattern.ReplaceAllString(
			value,
			"-",
		)

	return strings.Trim(
		value,
		"-",
	)
}
