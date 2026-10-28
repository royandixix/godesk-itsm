package category

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) ListActive(
	ctx context.Context,
) ([]Category, error) {
	const query = `
		SELECT
			id,
			name,
			slug,
			description,
			is_active,
			created_at,
			updated_at
		FROM categories
		WHERE is_active = TRUE
		ORDER BY name ASC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengambil kategori: %w",
			err,
		)
	}
	defer rows.Close()

	categories := make([]Category, 0)

	for rows.Next() {
		var item Category

		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Slug,
			&item.Description,
			&item.IsActive,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf(
				"gagal membaca kategori: %w",
				err,
			)
		}

		categories = append(
			categories,
			item,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf(
			"gagal membaca hasil kategori: %w",
			err,
		)
	}

	return categories, nil
}

func (r *Repository) ExistsActive(
	ctx context.Context,
	id int64,
) (bool, error) {
	const query = `
		SELECT EXISTS (
			SELECT 1
			FROM categories
			WHERE id = $1
			  AND is_active = TRUE
		)
	`

	var exists bool

	if err := r.db.QueryRow(
		ctx,
		query,
		id,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf(
			"gagal memeriksa kategori: %w",
			err,
		)
	}

	return exists, nil
}
