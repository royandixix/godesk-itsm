package notification

import (
	"context"
	"fmt"
	"strings"
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
	userID int64,
	limit int,
	offset int,
) (*ListResult, error) {
	return s.repository.ListForUser(
		ctx,
		userID,
		limit,
		offset,
	)
}

func (s *Service) UnreadCount(
	ctx context.Context,
	userID int64,
) (int64, error) {
	return s.repository.UnreadCount(
		ctx,
		userID,
	)
}

func (s *Service) MarkRead(
	ctx context.Context,
	notificationID int64,
	userID int64,
) error {
	return s.repository.MarkRead(
		ctx,
		notificationID,
		userID,
	)
}

func (s *Service) MarkAllRead(
	ctx context.Context,
	userID int64,
) (int64, error) {
	return s.repository.MarkAllRead(
		ctx,
		userID,
	)
}

func (s *Service) NotifyAgentAssigned(
	ctx context.Context,
	actorUserID int64,
	agentUserID int64,
	ticketID int64,
	ticketNumber string,
	subject string,
) error {
	if agentUserID <= 0 ||
		ticketID <= 0 {
		return nil
	}

	if agentUserID ==
		actorUserID {
		return nil
	}

	actorID :=
		actorUserID

	ticketIDValue :=
		ticketID

	title :=
		"Tiket baru ditugaskan kepada Anda"

	message :=
		fmt.Sprintf(
			"Anda menerima tiket %s",
			ticketNumber,
		)

	subject =
		strings.TrimSpace(
			subject,
		)

	if subject != "" {
		message =
			fmt.Sprintf(
				"Anda menerima tiket %s: %s",
				ticketNumber,
				subject,
			)
	}

	return s.repository.Create(
		ctx,
		CreateInput{
			RecipientUserID: agentUserID,

			ActorUserID: &actorID,

			TicketID: &ticketIDValue,

			Type: TypeAgentAssigned,

			Title: title,

			Message: message,
		},
	)
}

func (s *Service) NotifyStatusChanged(
	ctx context.Context,
	actorUserID int64,
	recipientUserID int64,
	ticketID int64,
	ticketNumber string,
	oldStatus string,
	newStatus string,
) error {
	if recipientUserID <= 0 ||
		recipientUserID ==
			actorUserID {
		return nil
	}

	actorID :=
		actorUserID

	ticketIDValue :=
		ticketID

	return s.repository.Create(
		ctx,
		CreateInput{
			RecipientUserID: recipientUserID,

			ActorUserID: &actorID,

			TicketID: &ticketIDValue,

			Type: TypeStatusChanged,

			Title: "Status tiket diperbarui",

			Message: fmt.Sprintf(
				"Status tiket %s berubah dari %s menjadi %s",
				ticketNumber,
				oldStatus,
				newStatus,
			),
		},
	)
}

func (s *Service) NotifyCommentAdded(
	ctx context.Context,
	actorUserID int64,
	recipientUserID int64,
	ticketID int64,
	ticketNumber string,
) error {
	if recipientUserID <= 0 ||
		recipientUserID ==
			actorUserID {
		return nil
	}

	actorID :=
		actorUserID

	ticketIDValue :=
		ticketID

	return s.repository.Create(
		ctx,
		CreateInput{
			RecipientUserID: recipientUserID,

			ActorUserID: &actorID,

			TicketID: &ticketIDValue,

			Type: TypeCommentAdded,

			Title: "Komentar baru pada tiket",

			Message: fmt.Sprintf(
				"Ada komentar baru pada tiket %s",
				ticketNumber,
			),
		},
	)
}
