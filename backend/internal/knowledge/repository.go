package knowledge

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound = errors.New(
		"artikel knowledge base tidak ditemukan",
	)

	ErrCategoryNotFound = errors.New(
		"kategori tidak ditemukan",
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

func (r *Repository) List(
	ctx context.Context,
	filter ListFilter,
	includeDrafts bool,
) ([]Article, error) {
	query := `
		SELECT
			ka.id,
			ka.category_id,
			COALESCE(c.name, ''),
			ka.author_id,
			u.name,
			ka.slug,
			ka.title,
			ka.summary,
			ka.content,
			ka.status,
			ka.published_at,
			ka.created_at,
			ka.updated_at
		FROM knowledge_articles ka
		LEFT JOIN categories c
			ON c.id = ka.category_id
		INNER JOIN users u
			ON u.id = ka.author_id
		WHERE 1 = 1
	`

	args := make(
		[]any,
		0,
		4,
	)

	if !includeDrafts {
		query += `
			AND ka.status = 'PUBLISHED'
		`
	} else if filter.Status != "" {
		args = append(
			args,
			string(filter.Status),
		)

		query += fmt.Sprintf(
			" AND ka.status = $%d",
			len(args),
		)
	}

	if filter.CategoryID != nil {
		args = append(
			args,
			*filter.CategoryID,
		)

		query += fmt.Sprintf(
			" AND ka.category_id = $%d",
			len(args),
		)
	}

	search := strings.TrimSpace(
		filter.Search,
	)

	if search != "" {
		args = append(
			args,
			"%"+search+"%",
		)

		position :=
			len(args)

		query += fmt.Sprintf(
			`
			AND (
				ka.title ILIKE $%d
				OR ka.summary ILIKE $%d
				OR ka.content ILIKE $%d
				OR ka.slug ILIKE $%d
			)
			`,
			position,
			position,
			position,
			position,
		)
	}

	query += `
		ORDER BY
			CASE
				WHEN ka.status = 'PUBLISHED' THEN 0
				ELSE 1
			END,
			COALESCE(
				ka.published_at,
				ka.updated_at
			) DESC,
			ka.id DESC
		LIMIT 100
	`

	rows, err :=
		r.db.Query(
			ctx,
			query,
			args...,
		)
	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal mengambil knowledge base: %w",
				err,
			)
	}
	defer rows.Close()

	items :=
		make(
			[]Article,
			0,
		)

	for rows.Next() {
		item, err :=
			scanArticle(
				rows,
			)
		if err != nil {
			return nil,
				err
		}

		items = append(
			items,
			*item,
		)
	}

	if err := rows.Err(); err != nil {
		return nil,
			fmt.Errorf(
				"gagal membaca knowledge base: %w",
				err,
			)
	}

	return items,
		nil
}

func (r *Repository) FindByID(
	ctx context.Context,
	id int64,
) (*Article, error) {
	const query = `
		SELECT
			ka.id,
			ka.category_id,
			COALESCE(c.name, ''),
			ka.author_id,
			u.name,
			ka.slug,
			ka.title,
			ka.summary,
			ka.content,
			ka.status,
			ka.published_at,
			ka.created_at,
			ka.updated_at
		FROM knowledge_articles ka
		LEFT JOIN categories c
			ON c.id = ka.category_id
		INNER JOIN users u
			ON u.id = ka.author_id
		WHERE ka.id = $1
		LIMIT 1
	`

	item, err :=
		scanArticle(
			r.db.QueryRow(
				ctx,
				query,
				id,
			),
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
			err
	}

	return item,
		nil
}

func (r *Repository) Create(
	ctx context.Context,
	authorID int64,
	categoryID *int64,
	slug string,
	title string,
	summary string,
	content string,
	status Status,
	publishedAt *time.Time,
) (*Article, error) {
	const query = `
		INSERT INTO knowledge_articles (
			category_id,
			author_id,
			slug,
			title,
			summary,
			content,
			status,
			published_at
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

	err :=
		r.db.QueryRow(
			ctx,
			query,
			categoryID,
			authorID,
			slug,
			title,
			summary,
			content,
			string(status),
			publishedAt,
		).Scan(
			&id,
		)

	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal membuat artikel knowledge base: %w",
				err,
			)
	}

	return r.FindByID(
		ctx,
		id,
	)
}

func (r *Repository) Update(
	ctx context.Context,
	id int64,
	categoryID *int64,
	slug string,
	title string,
	summary string,
	content string,
	status Status,
	publishedAt *time.Time,
) (*Article, error) {
	const query = `
		UPDATE knowledge_articles
		SET
			category_id = $2,
			slug = $3,
			title = $4,
			summary = $5,
			content = $6,
			status = $7,
			published_at = $8,
			updated_at = NOW()
		WHERE id = $1
	`

	result, err :=
		r.db.Exec(
			ctx,
			query,
			id,
			categoryID,
			slug,
			title,
			summary,
			content,
			string(status),
			publishedAt,
		)

	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal memperbarui artikel knowledge base: %w",
				err,
			)
	}

	if result.RowsAffected() == 0 {
		return nil,
			ErrNotFound
	}

	return r.FindByID(
		ctx,
		id,
	)
}

func (r *Repository) Delete(
	ctx context.Context,
	id int64,
) error {
	const query = `
		DELETE FROM knowledge_articles
		WHERE id = $1
	`

	result, err :=
		r.db.Exec(
			ctx,
			query,
			id,
		)

	if err != nil {
		return fmt.Errorf(
			"gagal menghapus artikel knowledge base: %w",
			err,
		)
	}

	if result.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) CategoryExists(
	ctx context.Context,
	id int64,
) (bool, error) {
	const query = `
		SELECT EXISTS (
			SELECT 1
			FROM categories
			WHERE id = $1
		)
	`

	var exists bool

	err :=
		r.db.QueryRow(
			ctx,
			query,
			id,
		).Scan(
			&exists,
		)

	if err != nil {
		return false,
			fmt.Errorf(
				"gagal memeriksa kategori: %w",
				err,
			)
	}

	return exists,
		nil
}

func (r *Repository) SlugExists(
	ctx context.Context,
	slug string,
	excludeID int64,
) (bool, error) {
	const query = `
		SELECT EXISTS (
			SELECT 1
			FROM knowledge_articles
			WHERE slug = $1
			  AND (
					$2 = 0
					OR id <> $2
			  )
		)
	`

	var exists bool

	err :=
		r.db.QueryRow(
			ctx,
			query,
			slug,
			excludeID,
		).Scan(
			&exists,
		)

	if err != nil {
		return false,
			fmt.Errorf(
				"gagal memeriksa slug knowledge base: %w",
				err,
			)
	}

	return exists,
		nil
}

type articleScanner interface {
	Scan(
		dest ...any,
	) error
}

func scanArticle(
	row articleScanner,
) (*Article, error) {
	var item Article

	err :=
		row.Scan(
			&item.ID,
			&item.CategoryID,
			&item.CategoryName,
			&item.AuthorID,
			&item.AuthorName,
			&item.Slug,
			&item.Title,
			&item.Summary,
			&item.Content,
			&item.Status,
			&item.PublishedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		)

	if err != nil {
		return nil,
			err
	}

	return &item,
		nil
}
