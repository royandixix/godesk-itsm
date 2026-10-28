package activity

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/royandixix/godesk/backend/internal/notification"
)

type Service struct {
	repository          *Repository
	notificationService *notification.Service
}

func NewService(
	repository *Repository,
	notificationService *notification.Service,
) *Service {
	return &Service{
		repository:          repository,
		notificationService: notificationService,
	}
}

func (s *Service) ListTimeline(
	ctx context.Context,
	ticketID int64,
	actor Actor,
) ([]TimelineItem, error) {
	return s.repository.ListTimeline(
		ctx,
		ticketID,
		actor,
	)
}

func (s *Service) CreateComment(
	ctx context.Context,
	ticketID int64,
	actor Actor,
	input CreateCommentInput,
) (*TimelineItem, error) {
	result, err :=
		s.repository.CreateComment(
			ctx,
			ticketID,
			actor,
			input.Body,
		)

	if err != nil {
		return nil, err
	}

	if s.notificationService == nil {
		return result, nil
	}

	ticketContext, err :=
		s.repository.GetTicketNotificationContext(
			ctx,
			ticketID,
		)

	if err != nil {
		log.Printf(
			"[NOTIFICATION WARN] gagal mengambil konteks tiket untuk komentar: %v",
			err,
		)

		return result, nil
	}

	recipients :=
		[]int64{
			ticketContext.CustomerID,
		}

	if ticketContext.AssignedAgentID != nil &&
		*ticketContext.AssignedAgentID !=
			ticketContext.CustomerID {
		recipients =
			append(
				recipients,
				*ticketContext.AssignedAgentID,
			)
	}

	for _, recipientUserID := range recipients {
		s.recordNotificationWarning(
			s.notificationService.NotifyCommentAdded(
				ctx,
				actor.UserID,
				recipientUserID,
				ticketContext.TicketID,
				ticketContext.TicketNumber,
			),
		)
	}

	return result, nil
}

func (s *Service) RecordTicketCreated(
	ctx context.Context,
	ticketID int64,
	actor Actor,
	ticketNumber string,
) error {
	actorID :=
		actor.UserID

	message :=
		fmt.Sprintf(
			"Tiket %s dibuat",
			ticketNumber,
		)

	return s.repository.RecordActivity(
		ctx,
		ActivityRecord{
			TicketID: ticketID,

			ActorUserID: &actorID,

			Type: TypeTicketCreated,

			Message: message,

			NewValue: &ticketNumber,
		},
	)
}

func (s *Service) RecordTicketUpdated(
	ctx context.Context,
	ticketID int64,
	actor Actor,
	fields []string,
) error {
	actorID :=
		actor.UserID

	fields =
		cleanFields(
			fields,
		)

	message :=
		"Detail tiket diperbarui"

	var newValue *string

	if len(fields) > 0 {
		summary :=
			strings.Join(
				fields,
				", ",
			)

		message =
			fmt.Sprintf(
				"Detail tiket diperbarui: %s",
				summary,
			)

		newValue =
			&summary
	}

	return s.repository.RecordActivity(
		ctx,
		ActivityRecord{
			TicketID: ticketID,

			ActorUserID: &actorID,

			Type: TypeTicketUpdated,

			Message: message,

			NewValue: newValue,
		},
	)
}

func (s *Service) RecordStatusChanged(
	ctx context.Context,
	ticketID int64,
	actor Actor,
	oldStatus string,
	newStatus string,
) error {
	actorID :=
		actor.UserID

	message :=
		fmt.Sprintf(
			"Status tiket diubah dari %s menjadi %s",
			oldStatus,
			newStatus,
		)

	return s.repository.RecordActivity(
		ctx,
		ActivityRecord{
			TicketID: ticketID,

			ActorUserID: &actorID,

			Type: TypeStatusChanged,

			Message: message,

			OldValue: &oldStatus,

			NewValue: &newStatus,
		},
	)
}

func (s *Service) RecordAgentAssigned(
	ctx context.Context,
	ticketID int64,
	actor Actor,
	oldAgent string,
	newAgent string,
) error {
	actorID :=
		actor.UserID

	message :=
		fmt.Sprintf(
			"Agent tiket diubah dari %s menjadi %s",
			oldAgent,
			newAgent,
		)

	return s.repository.RecordActivity(
		ctx,
		ActivityRecord{
			TicketID: ticketID,

			ActorUserID: &actorID,

			Type: TypeAgentAssigned,

			Message: message,

			OldValue: &oldAgent,

			NewValue: &newAgent,
		},
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

func cleanFields(
	fields []string,
) []string {
	result :=
		make(
			[]string,
			0,
			len(fields),
		)

	seen :=
		make(
			map[string]struct{},
		)

	for _, field := range fields {
		field =
			strings.TrimSpace(
				field,
			)

		if field == "" {
			continue
		}

		if _, exists :=
			seen[field]; exists {
			continue
		}

		seen[field] =
			struct{}{}

		result =
			append(
				result,
				field,
			)
	}

	return result
}
