package ticket

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/royandixix/godesk/backend/internal/activity"
	"github.com/royandixix/godesk/backend/internal/category"
	"github.com/royandixix/godesk/backend/internal/notification"
)

var (
	ErrForbidden = errors.New(
		"anda tidak memiliki akses untuk operasi ini",
	)

	ErrInvalidInput = errors.New(
		"data ticket tidak valid",
	)

	ErrCategoryNotFound = errors.New(
		"kategori tidak ditemukan atau tidak aktif",
	)

	ErrAgentNotFound = errors.New(
		"agent tidak ditemukan atau tidak aktif",
	)
)

type Service struct {
	repository          *Repository
	categoryRepository  *category.Repository
	activityService     *activity.Service
	notificationService *notification.Service
}

func NewService(
	repository *Repository,
	categoryRepository *category.Repository,
	activityService *activity.Service,
	notificationService *notification.Service,
) *Service {
	return &Service{
		repository:          repository,
		categoryRepository:  categoryRepository,
		activityService:     activityService,
		notificationService: notificationService,
	}
}

func (s *Service) Create(
	ctx context.Context,
	actor Actor,
	input CreateInput,
) (*Ticket, error) {
	if actor.UserID <= 0 {
		return nil, ErrForbidden
	}

	switch actor.Role {
	case "CUSTOMER", "SUPER_ADMIN":
	default:
		return nil, ErrForbidden
	}

	input.Subject = strings.TrimSpace(
		input.Subject,
	)

	input.Description = strings.TrimSpace(
		input.Description,
	)

	if input.CategoryID <= 0 {
		return nil, fmt.Errorf(
			"%w: category_id wajib diisi",
			ErrInvalidInput,
		)
	}

	if len(input.Subject) < 3 {
		return nil, fmt.Errorf(
			"%w: subject minimal 3 karakter",
			ErrInvalidInput,
		)
	}

	if len(input.Subject) > 200 {
		return nil, fmt.Errorf(
			"%w: subject maksimal 200 karakter",
			ErrInvalidInput,
		)
	}

	if len(input.Description) < 5 {
		return nil, fmt.Errorf(
			"%w: description minimal 5 karakter",
			ErrInvalidInput,
		)
	}

	if input.Priority == "" {
		input.Priority = PriorityMedium
	}

	if !validPriority(
		input.Priority,
	) {
		return nil, fmt.Errorf(
			"%w: priority tidak valid",
			ErrInvalidInput,
		)
	}

	categoryExists, err :=
		s.categoryRepository.ExistsActive(
			ctx,
			input.CategoryID,
		)

	if err != nil {
		return nil, err
	}

	if !categoryExists {
		return nil, ErrCategoryNotFound
	}

	id, err :=
		s.repository.NextID(
			ctx,
		)

	if err != nil {
		return nil, err
	}

	ticketNumber :=
		generateTicketNumber(
			id,
		)

	item, err :=
		s.repository.Create(
			ctx,
			id,
			ticketNumber,
			actor.UserID,
			input,
		)

	if err != nil {
		return nil, err
	}

	s.recordActivityWarning(
		s.activityService.RecordTicketCreated(
			ctx,
			item.ID,
			toActivityActor(
				actor,
			),
			item.TicketNumber,
		),
	)

	return item, nil
}

func (s *Service) List(
	ctx context.Context,
	actor Actor,
	filter ListFilter,
) (*ListResult, error) {
	if actor.UserID <= 0 {
		return nil, ErrForbidden
	}

	if !validRole(
		actor.Role,
	) {
		return nil, ErrForbidden
	}

	filter.Status =
		strings.ToUpper(
			strings.TrimSpace(
				filter.Status,
			),
		)

	filter.Priority =
		strings.ToUpper(
			strings.TrimSpace(
				filter.Priority,
			),
		)

	filter.Search =
		strings.TrimSpace(
			filter.Search,
		)

	if filter.Status != "" &&
		!validStatus(
			Status(
				filter.Status,
			),
		) {
		return nil, fmt.Errorf(
			"%w: filter status tidak valid",
			ErrInvalidInput,
		)
	}

	if filter.Priority != "" &&
		!validPriority(
			Priority(
				filter.Priority,
			),
		) {
		return nil, fmt.Errorf(
			"%w: filter priority tidak valid",
			ErrInvalidInput,
		)
	}

	return s.repository.List(
		ctx,
		actor,
		filter,
	)
}

func (s *Service) GetByID(
	ctx context.Context,
	actor Actor,
	id int64,
) (*Ticket, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}

	item, err :=
		s.repository.FindByID(
			ctx,
			id,
		)

	if err != nil {
		return nil, err
	}

	if !canView(
		actor,
		item,
	) {
		return nil, ErrForbidden
	}

	return item, nil
}

func (s *Service) Update(
	ctx context.Context,
	actor Actor,
	id int64,
	input UpdateInput,
) (*Ticket, error) {
	item, err :=
		s.repository.FindByID(
			ctx,
			id,
		)

	if err != nil {
		return nil, err
	}

	if !canUpdate(
		actor,
		item,
	) {
		return nil, ErrForbidden
	}

	changedFields :=
		make(
			[]string,
			0,
			4,
		)

	if input.Subject != nil {
		value :=
			strings.TrimSpace(
				*input.Subject,
			)

		if len(value) < 3 ||
			len(value) > 200 {
			return nil, fmt.Errorf(
				"%w: subject harus 3-200 karakter",
				ErrInvalidInput,
			)
		}

		input.Subject = &value

		if value !=
			item.Subject {
			changedFields =
				append(
					changedFields,
					"subject",
				)
		}
	}

	if input.Description != nil {
		value :=
			strings.TrimSpace(
				*input.Description,
			)

		if len(value) < 5 {
			return nil, fmt.Errorf(
				"%w: description minimal 5 karakter",
				ErrInvalidInput,
			)
		}

		input.Description = &value

		if value !=
			item.Description {
			changedFields =
				append(
					changedFields,
					"description",
				)
		}
	}

	if input.Priority != nil {
		if !validPriority(
			*input.Priority,
		) {
			return nil, fmt.Errorf(
				"%w: priority tidak valid",
				ErrInvalidInput,
			)
		}

		if *input.Priority !=
			item.Priority {
			changedFields =
				append(
					changedFields,
					"priority",
				)
		}
	}

	if input.CategoryID != nil {
		if *input.CategoryID <= 0 {
			return nil, fmt.Errorf(
				"%w: category_id tidak valid",
				ErrInvalidInput,
			)
		}

		exists, err :=
			s.categoryRepository.ExistsActive(
				ctx,
				*input.CategoryID,
			)

		if err != nil {
			return nil, err
		}

		if !exists {
			return nil, ErrCategoryNotFound
		}

		if *input.CategoryID !=
			item.CategoryID {
			changedFields =
				append(
					changedFields,
					"category",
				)
		}
	}

	updated, err :=
		s.repository.Update(
			ctx,
			id,
			input,
		)

	if err != nil {
		return nil, err
	}

	if len(
		changedFields,
	) > 0 {
		s.recordActivityWarning(
			s.activityService.RecordTicketUpdated(
				ctx,
				id,
				toActivityActor(
					actor,
				),
				changedFields,
			),
		)
	}

	return updated, nil
}

func (s *Service) UpdateStatus(
	ctx context.Context,
	actor Actor,
	id int64,
	status Status,
) (*Ticket, error) {
	status =
		Status(
			strings.ToUpper(
				strings.TrimSpace(
					string(
						status,
					),
				),
			),
		)

	if !validStatus(
		status,
	) {
		return nil, fmt.Errorf(
			"%w: status tidak valid",
			ErrInvalidInput,
		)
	}

	item, err :=
		s.repository.FindByID(
			ctx,
			id,
		)

	if err != nil {
		return nil, err
	}

	switch actor.Role {
	case "SUPER_ADMIN", "MANAGER":

	case "AGENT":
		if item.AssignedAgentID == nil ||
			*item.AssignedAgentID != actor.UserID {
			return nil, ErrForbidden
		}

	default:
		return nil, ErrForbidden
	}

	if item.Status ==
		status {
		return item, nil
	}

	updated, err :=
		s.repository.UpdateStatus(
			ctx,
			id,
			status,
		)

	if err != nil {
		return nil, err
	}

	s.recordActivityWarning(
		s.activityService.RecordStatusChanged(
			ctx,
			id,
			toActivityActor(
				actor,
			),
			string(
				item.Status,
			),
			string(
				updated.Status,
			),
		),
	)

	s.recordNotificationWarning(
		s.notificationService.NotifyStatusChanged(
			ctx,
			actor.UserID,
			updated.CustomerID,
			updated.ID,
			updated.TicketNumber,
			string(
				item.Status,
			),
			string(
				updated.Status,
			),
		),
	)

	return updated, nil
}

func (s *Service) AssignAgent(
	ctx context.Context,
	actor Actor,
	id int64,
	agentID int64,
) (*Ticket, error) {
	switch actor.Role {
	case "SUPER_ADMIN", "MANAGER":

	default:
		return nil, ErrForbidden
	}

	if id <= 0 ||
		agentID <= 0 {
		return nil, ErrInvalidInput
	}

	item, err :=
		s.repository.FindByID(
			ctx,
			id,
		)

	if err != nil {
		return nil, err
	}

	agent, err :=
		s.repository.FindActiveAgent(
			ctx,
			agentID,
		)

	if err != nil {
		return nil, err
	}

	if agent == nil {
		return nil, ErrAgentNotFound
	}

	if item.AssignedAgentID != nil &&
		*item.AssignedAgentID ==
			agentID {
		return item, nil
	}

	updated, err :=
		s.repository.AssignAgent(
			ctx,
			id,
			agentID,
		)

	if err != nil {
		return nil, err
	}

	oldAgent :=
		"Belum ditugaskan"

	if item.AssignedAgent != nil &&
		strings.TrimSpace(
			*item.AssignedAgent,
		) != "" {
		oldAgent =
			strings.TrimSpace(
				*item.AssignedAgent,
			)
	}

	s.recordActivityWarning(
		s.activityService.RecordAgentAssigned(
			ctx,
			id,
			toActivityActor(
				actor,
			),
			oldAgent,
			agent.Name,
		),
	)

	s.recordNotificationWarning(
		s.notificationService.NotifyAgentAssigned(
			ctx,
			actor.UserID,
			agentID,
			updated.ID,
			updated.TicketNumber,
			updated.Subject,
		),
	)

	if item.Status !=
		updated.Status {
		s.recordActivityWarning(
			s.activityService.RecordStatusChanged(
				ctx,
				id,
				toActivityActor(
					actor,
				),
				string(
					item.Status,
				),
				string(
					updated.Status,
				),
			),
		)

		s.recordNotificationWarning(
			s.notificationService.NotifyStatusChanged(
				ctx,
				actor.UserID,
				updated.CustomerID,
				updated.ID,
				updated.TicketNumber,
				string(
					item.Status,
				),
				string(
					updated.Status,
				),
			),
		)
	}

	return updated, nil
}

func (s *Service) Delete(
	ctx context.Context,
	actor Actor,
	id int64,
) error {
	if actor.UserID <= 0 {
		return ErrForbidden
	}

	if id <= 0 {
		return ErrInvalidInput
	}

	switch actor.Role {
	case "SUPER_ADMIN", "MANAGER":

	default:
		return ErrForbidden
	}

	return s.repository.Delete(
		ctx,
		id,
	)
}

func (
	s *Service,
) recordActivityWarning(
	err error,
) {
	if err == nil {
		return
	}

	log.Printf(
		"[ACTIVITY WARN] %v",
		err,
	)
}

func (
	s *Service,
) recordNotificationWarning(
	err error,
) {
	if err == nil {
		return
	}

	log.Printf(
		"[NOTIFICATION WARN] %v",
		err,
	)
}

func toActivityActor(
	actor Actor,
) activity.Actor {
	return activity.Actor{
		UserID: actor.UserID,
		Role:   actor.Role,
	}
}

func generateTicketNumber(
	id int64,
) string {
	return fmt.Sprintf(
		"GDK-%s-%06d",
		time.Now().
			Format(
				"20060102",
			),
		id,
	)
}

func validPriority(
	priority Priority,
) bool {
	switch priority {
	case PriorityLow,
		PriorityMedium,
		PriorityHigh,
		PriorityUrgent:
		return true

	default:
		return false
	}
}

func validStatus(
	status Status,
) bool {
	switch status {
	case StatusOpen,
		StatusInProgress,
		StatusResolved,
		StatusClosed:
		return true

	default:
		return false
	}
}

func validRole(
	role string,
) bool {
	switch role {
	case "SUPER_ADMIN",
		"MANAGER",
		"AGENT",
		"CUSTOMER":
		return true

	default:
		return false
	}
}

func canView(
	actor Actor,
	item *Ticket,
) bool {
	switch actor.Role {
	case "SUPER_ADMIN",
		"MANAGER":
		return true

	case "CUSTOMER":
		return item.CustomerID ==
			actor.UserID

	case "AGENT":
		return item.AssignedAgentID != nil &&
			*item.AssignedAgentID ==
				actor.UserID

	default:
		return false
	}
}

func canUpdate(
	actor Actor,
	item *Ticket,
) bool {
	switch actor.Role {
	case "SUPER_ADMIN":
		return true

	case "CUSTOMER":
		return item.CustomerID ==
			actor.UserID &&
			item.Status ==
				StatusOpen

	default:
		return false
	}
}
