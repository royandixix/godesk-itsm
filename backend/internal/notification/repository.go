package notification

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New(
	"notifikasi tidak ditemukan",
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

func (r *Repository) Create(
	ctx context.Context,
	input CreateInput,
) error {
	const query = `
		INSERT INTO notifications (
			recipient_user_id,
			actor_user_id,
			ticket_id,
			type,
			title,
			message
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

	_, err :=
		r.db.Exec(
			ctx,
			query,
			input.RecipientUserID,
			input.ActorUserID,
			input.TicketID,
			input.Type,
			input.Title,
			input.Message,
		)

	if err != nil {
		return fmt.Errorf(
			"gagal membuat notifikasi: %w",
			err,
		)
	}

	return nil
}

func (r *Repository) ListForUser(
	ctx context.Context,
	userID int64,
	limit int,
	offset int,
) (*ListResult, error) {
	if limit <= 0 {
		limit = 20
	}

	if limit > 100 {
		limit = 100
	}

	if offset < 0 {
		offset = 0
	}

	const countQuery = `
		SELECT COUNT(*)
		FROM notifications
		WHERE recipient_user_id = $1
	`

	var total int64

	err :=
		r.db.QueryRow(
			ctx,
			countQuery,
			userID,
		).Scan(
			&total,
		)

	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal menghitung notifikasi: %w",
				err,
			)
	}

	const listQuery = `
		SELECT
			n.id,
			n.recipient_user_id,
			n.actor_user_id,
			actor.name,
			n.ticket_id,
			t.ticket_number,
			n.type,
			n.title,
			n.message,
			n.is_read,
			n.read_at,
			n.created_at
		FROM notifications n
		LEFT JOIN users actor
			ON actor.id = n.actor_user_id
		LEFT JOIN tickets t
			ON t.id = n.ticket_id
		WHERE n.recipient_user_id = $1
		ORDER BY
			n.created_at DESC,
			n.id DESC
		LIMIT $2
		OFFSET $3
	`

	rows, err :=
		r.db.Query(
			ctx,
			listQuery,
			userID,
			limit,
			offset,
		)

	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal mengambil notifikasi: %w",
				err,
			)
	}

	defer rows.Close()

	items :=
		make(
			[]Notification,
			0,
		)

	for rows.Next() {
		var item Notification

		err :=
			rows.Scan(
				&item.ID,
				&item.RecipientUserID,
				&item.ActorUserID,
				&item.ActorName,
				&item.TicketID,
				&item.TicketNumber,
				&item.Type,
				&item.Title,
				&item.Message,
				&item.IsRead,
				&item.ReadAt,
				&item.CreatedAt,
			)

		if err != nil {
			return nil,
				fmt.Errorf(
					"gagal membaca notifikasi: %w",
					err,
				)
		}

		items =
			append(
				items,
				item,
			)
	}

	if err := rows.Err(); err != nil {
		return nil,
			fmt.Errorf(
				"gagal membaca daftar notifikasi: %w",
				err,
			)
	}

	return &ListResult{
			Items: items,

			Total: total,

			Limit: limit,

			Offset: offset,
		},
		nil
}

func (r *Repository) UnreadCount(
	ctx context.Context,
	userID int64,
) (int64, error) {
	const query = `
		SELECT COUNT(*)
		FROM notifications
		WHERE recipient_user_id = $1
		  AND is_read = FALSE
	`

	var count int64

	err :=
		r.db.QueryRow(
			ctx,
			query,
			userID,
		).Scan(
			&count,
		)

	if err != nil {
		return 0,
			fmt.Errorf(
				"gagal menghitung notifikasi belum dibaca: %w",
				err,
			)
	}

	return count,
		nil
}

func (r *Repository) MarkRead(
	ctx context.Context,
	notificationID int64,
	userID int64,
) error {
	const query = `
		UPDATE notifications
		SET
			is_read = TRUE,
			read_at = COALESCE(
				read_at,
				NOW()
			)
		WHERE id = $1
		  AND recipient_user_id = $2
		RETURNING id
	`

	var id int64

	err :=
		r.db.QueryRow(
			ctx,
			query,
			notificationID,
			userID,
		).Scan(
			&id,
		)

	if errors.Is(
		err,
		pgx.ErrNoRows,
	) {
		return ErrNotFound
	}

	if err != nil {
		return fmt.Errorf(
			"gagal menandai notifikasi sebagai dibaca: %w",
			err,
		)
	}

	return nil
}

func (r *Repository) MarkAllRead(
	ctx context.Context,
	userID int64,
) (int64, error) {
	const query = `
		UPDATE notifications
		SET
			is_read = TRUE,
			read_at = COALESCE(
				read_at,
				NOW()
			)
		WHERE recipient_user_id = $1
		  AND is_read = FALSE
	`

	result, err :=
		r.db.Exec(
			ctx,
			query,
			userID,
		)

	if err != nil {
		return 0,
			fmt.Errorf(
				"gagal menandai semua notifikasi sebagai dibaca: %w",
				err,
			)
	}

	return result.RowsAffected(),
		nil
}
