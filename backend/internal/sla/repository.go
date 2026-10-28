package sla

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("SLA tiket tidak ditemukan")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListPolicies(ctx context.Context) ([]Policy, error) {
	rows, err := r.db.Query(ctx, `
		SELECT priority, first_response_minutes,
		       resolution_minutes, updated_at
		FROM sla_policies
		ORDER BY CASE priority
			WHEN 'URGENT' THEN 1
			WHEN 'HIGH' THEN 2
			WHEN 'MEDIUM' THEN 3
			ELSE 4
		END
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Policy{}

	for rows.Next() {
		var p Policy
		if err := rows.Scan(
			&p.Priority,
			&p.FirstResponseMinutes,
			&p.ResolutionMinutes,
			&p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, p)
	}
	return items, rows.Err()
}

func (r *Repository) UpdatePolicy(
	ctx context.Context,
	priority string,
	response, resolution int,
) (*Policy, error) {
	var p Policy

	err := r.db.QueryRow(ctx, `
		UPDATE sla_policies
		SET first_response_minutes = $2,
		    resolution_minutes = $3,
		    updated_at = NOW()
		WHERE priority = $1
		RETURNING priority, first_response_minutes,
		          resolution_minutes, updated_at
	`, priority, response, resolution).Scan(
		&p.Priority,
		&p.FirstResponseMinutes,
		&p.ResolutionMinutes,
		&p.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) GetTicket(
	ctx context.Context,
	id int64,
) (*TicketSLA, error) {
	var result TicketSLA
	var created time.Time

	err := r.db.QueryRow(ctx, `
		SELECT
			s.ticket_id, s.priority, t.created_at,
			s.response_due_at, s.first_responded_at,
			s.first_response_met, s.resolution_due_at,
			s.first_resolved_at, s.resolution_met
		FROM ticket_slas s
		JOIN tickets t ON t.id = s.ticket_id
		WHERE s.ticket_id = $1
	`, id).Scan(
		&result.TicketID,
		&result.Priority,
		&created,
		&result.FirstResponse.DueAt,
		&result.FirstResponse.CompletedAt,
		&result.FirstResponse.Met,
		&result.Resolution.DueAt,
		&result.Resolution.CompletedAt,
		&result.Resolution.Met,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("gagal membaca SLA tiket: %w", err)
	}

	now := time.Now()

	result.FirstResponse.Status = status(
		result.FirstResponse.DueAt,
		result.FirstResponse.CompletedAt,
		result.FirstResponse.Met,
		now, created,
	)

	result.Resolution.Status = status(
		result.Resolution.DueAt,
		result.Resolution.CompletedAt,
		result.Resolution.Met,
		now, created,
	)

	return &result, nil
}

func (r *Repository) GetOverview(ctx context.Context) (*Overview, error) {
	var result Overview

	err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),

			COUNT(*) FILTER (
				WHERE first_response_met = FALSE
				OR (
					first_responded_at IS NULL
					AND NOW() >= response_due_at
				)
			),

			COUNT(*) FILTER (
				WHERE resolution_met = FALSE
				OR (
					first_resolved_at IS NULL
					AND NOW() >= resolution_due_at
				)
			),

			COUNT(*) FILTER (WHERE first_response_met = TRUE),
			COUNT(*) FILTER (WHERE resolution_met = TRUE),

			COUNT(*) FILTER (
				WHERE (
					first_responded_at IS NULL
					AND NOW() < response_due_at
					AND NOW() >= response_due_at
						- (response_due_at - t.created_at)/5
				)
				OR (
					first_resolved_at IS NULL
					AND NOW() < resolution_due_at
					AND NOW() >= resolution_due_at
						- (resolution_due_at - t.created_at)/5
				)
			)
		FROM ticket_slas s
		JOIN tickets t ON t.id = s.ticket_id
	`).Scan(
		&result.TotalTickets,
		&result.ResponseBreached,
		&result.ResolutionBreached,
		&result.ResponseMet,
		&result.ResolutionMet,
		&result.AtRisk,
	)

	if err != nil {
		return nil, fmt.Errorf("gagal membaca ringkasan SLA: %w", err)
	}
	return &result, nil
}

func (r *Repository) ListTickets(
	ctx context.Context,
	filter string,
	limit, offset int,
) (*TicketList, error) {
	const base = `
	WITH ticket_statuses AS (
		SELECT
			t.id, t.ticket_number, t.subject,
			t.priority, t.status AS ticket_status,
			a.name AS agent_name,
			s.response_due_at, s.resolution_due_at,

			CASE
				WHEN s.first_responded_at IS NOT NULL
					THEN CASE WHEN s.first_response_met
						THEN 'MET' ELSE 'BREACHED' END
				WHEN NOW() >= s.response_due_at THEN 'BREACHED'
				WHEN NOW() >= s.response_due_at
					- (s.response_due_at-t.created_at)/5
					THEN 'AT_RISK'
				ELSE 'ON_TRACK'
			END AS response_status,

			CASE
				WHEN s.first_resolved_at IS NOT NULL
					THEN CASE WHEN s.resolution_met
						THEN 'MET' ELSE 'BREACHED' END
				WHEN NOW() >= s.resolution_due_at THEN 'BREACHED'
				WHEN NOW() >= s.resolution_due_at
					- (s.resolution_due_at-t.created_at)/5
					THEN 'AT_RISK'
				ELSE 'ON_TRACK'
			END AS resolution_status

		FROM ticket_slas s
		JOIN tickets t ON t.id = s.ticket_id
		LEFT JOIN users a ON a.id = t.assigned_agent_id
	)`

	const condition = `
		WHERE (
			$1 = 'ALL'
			OR response_status = $1
			OR resolution_status = $1
		)`

	data := &TicketList{
		Items:  make([]TicketSummary, 0),
		Limit:  limit,
		Offset: offset,
	}

	err := r.db.QueryRow(
		ctx,
		base+` SELECT COUNT(*) FROM ticket_statuses `+condition,
		filter,
	).Scan(&data.Total)

	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, base+`
		SELECT id, ticket_number, subject, priority,
		       ticket_status, agent_name,
		       response_status, resolution_status,
		       response_due_at, resolution_due_at
		FROM ticket_statuses
	`+condition+`
		ORDER BY
			CASE
				WHEN response_status = 'BREACHED'
				  OR resolution_status = 'BREACHED' THEN 0
				WHEN response_status = 'AT_RISK'
				  OR resolution_status = 'AT_RISK' THEN 1
				ELSE 2
			END,
			response_due_at ASC,
			id DESC
		LIMIT $2 OFFSET $3
	`, filter, limit, offset)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item TicketSummary

		if err := rows.Scan(
			&item.ID,
			&item.TicketNumber,
			&item.Subject,
			&item.Priority,
			&item.TicketStatus,
			&item.AgentName,
			&item.ResponseStatus,
			&item.ResolutionStatus,
			&item.ResponseDueAt,
			&item.ResolutionDueAt,
		); err != nil {
			return nil, err
		}

		data.Items = append(data.Items, item)
	}

	return data, rows.Err()
}
