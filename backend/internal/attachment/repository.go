package attachment

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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
) (*Attachment, error) {
	const query = `
		INSERT INTO ticket_attachments (
			ticket_id,
			uploaded_by,
			original_name,
			stored_name,
			storage_path,
			mime_type,
			file_extension,
			size_bytes
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
			$6,
			$7,
			$8
		)
		RETURNING id
	`

	var id int64

	err := r.db.QueryRow(
		ctx,
		query,
		input.TicketID,
		input.UploadedBy,
		input.OriginalName,
		input.StoredName,
		input.StoragePath,
		input.MimeType,
		input.FileExtension,
		input.SizeBytes,
	).Scan(
		&id,
	)
	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal menyimpan metadata lampiran: %w",
				err,
			)
	}

	return r.FindByID(
		ctx,
		id,
	)
}

func (r *Repository) ListByTicket(
	ctx context.Context,
	ticketID int64,
) ([]Attachment, error) {
	const query = `
		SELECT
			a.id,
			a.ticket_id,
			a.uploaded_by,
			u.name,
			a.original_name,
			a.stored_name,
			a.storage_path,
			a.mime_type,
			COALESCE(
				a.file_extension,
				''
			),
			a.size_bytes,
			a.created_at
		FROM ticket_attachments a
		INNER JOIN users u
			ON u.id = a.uploaded_by
		WHERE a.ticket_id = $1
		ORDER BY
			a.created_at DESC,
			a.id DESC
	`

	rows, err := r.db.Query(
		ctx,
		query,
		ticketID,
	)
	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal mengambil daftar lampiran: %w",
				err,
			)
	}

	defer rows.Close()

	items := make(
		[]Attachment,
		0,
	)

	for rows.Next() {
		var item Attachment

		if err := rows.Scan(
			&item.ID,
			&item.TicketID,
			&item.UploadedBy,
			&item.UploaderName,
			&item.OriginalName,
			&item.StoredName,
			&item.StoragePath,
			&item.MimeType,
			&item.FileExtension,
			&item.SizeBytes,
			&item.CreatedAt,
		); err != nil {
			return nil,
				fmt.Errorf(
					"gagal membaca data lampiran: %w",
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
				"gagal membaca daftar lampiran: %w",
				err,
			)
	}

	return items, nil
}

func (r *Repository) FindByID(
	ctx context.Context,
	id int64,
) (*Attachment, error) {
	const query = `
		SELECT
			a.id,
			a.ticket_id,
			a.uploaded_by,
			u.name,
			a.original_name,
			a.stored_name,
			a.storage_path,
			a.mime_type,
			COALESCE(
				a.file_extension,
				''
			),
			a.size_bytes,
			a.created_at
		FROM ticket_attachments a
		INNER JOIN users u
			ON u.id = a.uploaded_by
		WHERE a.id = $1
		LIMIT 1
	`

	var item Attachment

	err := r.db.QueryRow(
		ctx,
		query,
		id,
	).Scan(
		&item.ID,
		&item.TicketID,
		&item.UploadedBy,
		&item.UploaderName,
		&item.OriginalName,
		&item.StoredName,
		&item.StoragePath,
		&item.MimeType,
		&item.FileExtension,
		&item.SizeBytes,
		&item.CreatedAt,
	)

	if errors.Is(
		err,
		pgx.ErrNoRows,
	) {
		return nil,
			ErrNotFound
	}

	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal mengambil lampiran: %w",
				err,
			)
	}

	return &item, nil
}

func (r *Repository) Delete(
	ctx context.Context,
	id int64,
) error {
	const query = `
		DELETE FROM ticket_attachments
		WHERE id = $1
	`

	result, err := r.db.Exec(
		ctx,
		query,
		id,
	)
	if err != nil {
		return fmt.Errorf(
			"gagal menghapus metadata lampiran: %w",
			err,
		)
	}

	if result.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}
