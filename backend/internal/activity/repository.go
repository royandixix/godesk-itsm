package activity

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/royandixix/godesk/backend/internal/user"
)

var (
	ErrTicketNotFound = errors.New(
		"tiket tidak ditemukan",
	)

	ErrForbidden = errors.New(
		"Anda tidak memiliki akses ke tiket ini",
	)

	ErrInvalidComment = errors.New(
		"komentar wajib diisi maksimal 5000 karakter",
	)
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(
	db *pgxpool.Pool,
) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) ensureAccess(
	ctx context.Context,
	ticketID int64,
	actor Actor,
) error {
	const query = `
		SELECT
			customer_id,
			assigned_agent_id
		FROM tickets
		WHERE id = $1
		LIMIT 1
	`

	var customerID int64

	var assignedAgentID *int64

	err := r.db.QueryRow(
		ctx,
		query,
		ticketID,
	).Scan(
		&customerID,
		&assignedAgentID,
	)

	if errors.Is(
		err,
		pgx.ErrNoRows,
	) {
		return ErrTicketNotFound
	}

	if err != nil {
		return fmt.Errorf(
			"gagal memeriksa akses tiket: %w",
			err,
		)
	}

	switch actor.Role {
	case user.RoleSuperAdmin,
		user.RoleManager:
		return nil

	case user.RoleCustomer:
		if customerID ==
			actor.UserID {
			return nil
		}

	case user.RoleAgent:
		if assignedAgentID != nil &&
			*assignedAgentID ==
				actor.UserID {
			return nil
		}
	}

	return ErrForbidden
}

func (r *Repository) ListTimeline(
	ctx context.Context,
	ticketID int64,
	actor Actor,
) ([]TimelineItem, error) {
	if err := r.ensureAccess(
		ctx,
		ticketID,
		actor,
	); err != nil {
		return nil, err
	}

	const query = `
		SELECT
			result.id,
			result.kind,
			result.type,
			result.actor_user_id,
			result.actor_name,
			result.actor_role,
			result.message,
			result.old_value,
			result.new_value,
			result.created_at
		FROM (
			SELECT
				a.id,
				'ACTIVITY'::text AS kind,
				a.activity_type::text AS type,
				a.actor_user_id,
				COALESCE(
					u.name,
					'Sistem'
				)::text AS actor_name,
				COALESCE(
					r.code,
					'SYSTEM'
				)::text AS actor_role,
				a.message::text AS message,
				a.old_value::text AS old_value,
				a.new_value::text AS new_value,
				a.created_at
			FROM ticket_activities a
			LEFT JOIN users u
				ON u.id =
					a.actor_user_id
			LEFT JOIN roles r
				ON r.id =
					u.role_id
			WHERE a.ticket_id = $1

			UNION ALL

			SELECT
				c.id,
				'COMMENT'::text AS kind,
				'COMMENT'::text AS type,
				c.user_id AS actor_user_id,
				u.name::text AS actor_name,
				r.code::text AS actor_role,
				c.body::text AS message,
				NULL::text AS old_value,
				NULL::text AS new_value,
				c.created_at
			FROM ticket_comments c
			INNER JOIN users u
				ON u.id =
					c.user_id
			INNER JOIN roles r
				ON r.id =
					u.role_id
			WHERE c.ticket_id = $1
		) AS result
		ORDER BY
			result.created_at ASC,
			result.id ASC
	`

	rows, err := r.db.Query(
		ctx,
		query,
		ticketID,
	)
	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal mengambil aktivitas tiket: %w",
				err,
			)
	}

	defer rows.Close()

	items := make(
		[]TimelineItem,
		0,
	)

	for rows.Next() {
		var item TimelineItem

		if err := rows.Scan(
			&item.ID,
			&item.Kind,
			&item.Type,
			&item.ActorUserID,
			&item.ActorName,
			&item.ActorRole,
			&item.Message,
			&item.OldValue,
			&item.NewValue,
			&item.CreatedAt,
		); err != nil {
			return nil,
				fmt.Errorf(
					"gagal membaca aktivitas tiket: %w",
					err,
				)
		}

		items = append(
			items,
			item,
		)
	}

	if err := rows.Err(); err != nil {
		return nil,
			fmt.Errorf(
				"gagal membaca aktivitas tiket: %w",
				err,
			)
	}

	return items, nil
}

func (r *Repository) CreateComment(
	ctx context.Context,
	ticketID int64,
	actor Actor,
	body string,
) (*TimelineItem, error) {
	if err := r.ensureAccess(
		ctx,
		ticketID,
		actor,
	); err != nil {
		return nil, err
	}

	body =
		strings.TrimSpace(
			body,
		)

	if body == "" ||
		len(
			[]rune(
				body,
			),
		) > 5000 {
		return nil,
			ErrInvalidComment
	}

	const query = `
		WITH inserted AS (
			INSERT INTO ticket_comments (
				ticket_id,
				user_id,
				body
			)
			VALUES (
				$1,
				$2,
				$3
			)
			RETURNING
				id,
				user_id,
				body,
				created_at
		)
		SELECT
			i.id,
			'COMMENT'::text AS kind,
			'COMMENT'::text AS type,
			i.user_id,
			u.name,
			r.code,
			i.body,
			NULL::text,
			NULL::text,
			i.created_at
		FROM inserted i
		INNER JOIN users u
			ON u.id =
				i.user_id
		INNER JOIN roles r
			ON r.id =
				u.role_id
	`

	var result TimelineItem

	err := r.db.QueryRow(
		ctx,
		query,
		ticketID,
		actor.UserID,
		body,
	).Scan(
		&result.ID,
		&result.Kind,
		&result.Type,
		&result.ActorUserID,
		&result.ActorName,
		&result.ActorRole,
		&result.Message,
		&result.OldValue,
		&result.NewValue,
		&result.CreatedAt,
	)

	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal menyimpan komentar: %w",
				err,
			)
	}

	return &result, nil
}

func (r *Repository) RecordActivity(
	ctx context.Context,
	record ActivityRecord,
) error {
	const query = `
		INSERT INTO ticket_activities (
			ticket_id,
			actor_user_id,
			activity_type,
			message,
			old_value,
			new_value
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
			$6
		)
	`

	_, err := r.db.Exec(
		ctx,
		query,
		record.TicketID,
		record.ActorUserID,
		record.Type,
		record.Message,
		record.OldValue,
		record.NewValue,
	)

	if err != nil {
		return fmt.Errorf(
			"gagal menyimpan aktivitas tiket: %w",
			err,
		)
	}

	return nil
}

func (r *Repository) GetTicketNotificationContext(
	ctx context.Context,
	ticketID int64,
) (*TicketNotificationContext, error) {
	const query = `
		SELECT
			id,
			ticket_number,
			customer_id,
			assigned_agent_id
		FROM tickets
		WHERE id = $1
		LIMIT 1
	`

	var result TicketNotificationContext

	err := r.db.QueryRow(
		ctx,
		query,
		ticketID,
	).Scan(
		&result.TicketID,
		&result.TicketNumber,
		&result.CustomerID,
		&result.AssignedAgentID,
	)

	if errors.Is(
		err,
		pgx.ErrNoRows,
	) {
		return nil, ErrTicketNotFound
	}

	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengambil konteks notifikasi tiket: %w",
			err,
		)
	}

	return &result, nil
}
