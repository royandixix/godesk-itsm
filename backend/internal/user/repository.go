package user

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound = errors.New("user tidak ditemukan")
	ErrEmailExists  = errors.New("email sudah digunakan")
	ErrRoleNotFound = errors.New("role tidak ditemukan")
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

func (r *Repository) CreateWithRole(
	ctx context.Context,
	name string,
	email string,
	passwordHash string,
	roleCode string,
) (*User, error) {
	const query = `
		WITH selected_role AS (
			SELECT
				id,
				code
			FROM roles
			WHERE code = $4
		)
		INSERT INTO users (
			role_id,
			name,
			email,
			password_hash
		)
		SELECT
			selected_role.id,
			$1,
			$2,
			$3
		FROM selected_role
		RETURNING
			id,
			role_id,
			name,
			email,
			password_hash,
			status,
			created_at,
			updated_at
	`

	var result User

	err := r.db.QueryRow(
		ctx,
		query,
		name,
		email,
		passwordHash,
		roleCode,
	).Scan(
		&result.ID,
		&result.RoleID,
		&result.Name,
		&result.Email,
		&result.PasswordHash,
		&result.Status,
		&result.CreatedAt,
		&result.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRoleNotFound
	}

	if err != nil {
		var pgErr *pgconn.PgError

		if errors.As(err, &pgErr) &&
			pgErr.Code == "23505" {
			return nil, ErrEmailExists
		}

		return nil, fmt.Errorf(
			"gagal membuat user: %w",
			err,
		)
	}

	result.RoleCode = roleCode

	return &result, nil
}

func (r *Repository) FindByEmail(
	ctx context.Context,
	email string,
) (*User, error) {
	const query = `
		SELECT
			u.id,
			u.role_id,
			r.code,
			u.name,
			u.email,
			u.password_hash,
			u.status,
			u.created_at,
			u.updated_at
		FROM users u
		INNER JOIN roles r
			ON r.id = u.role_id
		WHERE LOWER(u.email) = LOWER($1)
		LIMIT 1
	`

	var result User

	err := r.db.QueryRow(
		ctx,
		query,
		email,
	).Scan(
		&result.ID,
		&result.RoleID,
		&result.RoleCode,
		&result.Name,
		&result.Email,
		&result.PasswordHash,
		&result.Status,
		&result.CreatedAt,
		&result.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}

	if err != nil {
		return nil, fmt.Errorf(
			"gagal mencari user berdasarkan email: %w",
			err,
		)
	}

	return &result, nil
}

func (r *Repository) FindByID(
	ctx context.Context,
	id int64,
) (*User, error) {
	const query = `
		SELECT
			u.id,
			u.role_id,
			r.code,
			u.name,
			u.email,
			u.password_hash,
			u.status,
			u.created_at,
			u.updated_at
		FROM users u
		INNER JOIN roles r
			ON r.id = u.role_id
		WHERE u.id = $1
		LIMIT 1
	`

	var result User

	err := r.db.QueryRow(
		ctx,
		query,
		id,
	).Scan(
		&result.ID,
		&result.RoleID,
		&result.RoleCode,
		&result.Name,
		&result.Email,
		&result.PasswordHash,
		&result.Status,
		&result.CreatedAt,
		&result.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}

	if err != nil {
		return nil, fmt.Errorf(
			"gagal mencari user berdasarkan id: %w",
			err,
		)
	}

	return &result, nil
}

func (r *Repository) List(
	ctx context.Context,
	filter ListFilter,
) (*ListResult, error) {
	const query = `
		SELECT
			u.id,
			u.role_id,
			r.code,
			u.name,
			u.email,
			u.status,
			u.created_at,
			u.updated_at,
			COUNT(*) OVER()
		FROM users u
		INNER JOIN roles r
			ON r.id = u.role_id
		WHERE
			($1 = '' OR r.code = $1)
			AND ($2 = '' OR u.status = $2)
			AND (
				$3 = ''
				OR u.name ILIKE '%' || $3 || '%'
				OR u.email ILIKE '%' || $3 || '%'
			)
		ORDER BY
			u.created_at DESC,
			u.id DESC
		LIMIT $4
		OFFSET $5
	`

	rows, err := r.db.Query(
		ctx,
		query,
		filter.Role,
		filter.Status,
		filter.Search,
		filter.Limit,
		filter.Offset,
	)
	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengambil daftar user: %w",
			err,
		)
	}
	defer rows.Close()

	items := make([]User, 0)
	var total int64

	for rows.Next() {
		var item User
		var rowTotal int64

		if err := rows.Scan(
			&item.ID,
			&item.RoleID,
			&item.RoleCode,
			&item.Name,
			&item.Email,
			&item.Status,
			&item.CreatedAt,
			&item.UpdatedAt,
			&rowTotal,
		); err != nil {
			return nil, fmt.Errorf(
				"gagal membaca data user: %w",
				err,
			)
		}

		total = rowTotal
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf(
			"gagal membaca daftar user: %w",
			err,
		)
	}

	return &ListResult{
		Items:  items,
		Total:  total,
		Limit:  filter.Limit,
		Offset: filter.Offset,
	}, nil
}

func (r *Repository) Update(
	ctx context.Context,
	id int64,
	name string,
	email string,
	roleCode string,
	passwordHash *string,
) (*User, error) {
	const query = `
		UPDATE users AS u
		SET
			role_id = r.id,
			name = $2,
			email = $3,
			password_hash = COALESCE(
				$5::text,
				u.password_hash
			),
			updated_at = NOW()
		FROM roles AS r
		WHERE
			u.id = $1
			AND r.code = $4
		RETURNING
			u.id,
			u.role_id,
			r.code,
			u.name,
			u.email,
			u.password_hash,
			u.status,
			u.created_at,
			u.updated_at
	`

	var result User

	err := r.db.QueryRow(
		ctx,
		query,
		id,
		name,
		email,
		roleCode,
		passwordHash,
	).Scan(
		&result.ID,
		&result.RoleID,
		&result.RoleCode,
		&result.Name,
		&result.Email,
		&result.PasswordHash,
		&result.Status,
		&result.CreatedAt,
		&result.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}

	if err != nil {
		var pgErr *pgconn.PgError

		if errors.As(err, &pgErr) &&
			pgErr.Code == "23505" {
			return nil, ErrEmailExists
		}

		return nil, fmt.Errorf(
			"gagal memperbarui user: %w",
			err,
		)
	}

	return &result, nil
}

func (r *Repository) UpdateStatus(
	ctx context.Context,
	id int64,
	status string,
) (*User, error) {
	const query = `
		UPDATE users AS u
		SET
			status = $2,
			updated_at = NOW()
		WHERE u.id = $1
		RETURNING
			u.id,
			u.role_id,
			(
				SELECT r.code
				FROM roles r
				WHERE r.id = u.role_id
			),
			u.name,
			u.email,
			u.password_hash,
			u.status,
			u.created_at,
			u.updated_at
	`

	var result User

	err := r.db.QueryRow(
		ctx,
		query,
		id,
		status,
	).Scan(
		&result.ID,
		&result.RoleID,
		&result.RoleCode,
		&result.Name,
		&result.Email,
		&result.PasswordHash,
		&result.Status,
		&result.CreatedAt,
		&result.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}

	if err != nil {
		return nil, fmt.Errorf(
			"gagal memperbarui status user: %w",
			err,
		)
	}

	return &result, nil
}

func (r *Repository) CountActiveSuperAdmins(
	ctx context.Context,
) (int64, error) {
	const query = `
		SELECT COUNT(*)
		FROM users u
		INNER JOIN roles r
			ON r.id = u.role_id
		WHERE
			r.code = $1
			AND u.status = $2
	`

	var total int64

	if err := r.db.QueryRow(
		ctx,
		query,
		RoleSuperAdmin,
		StatusActive,
	).Scan(&total); err != nil {
		return 0, fmt.Errorf(
			"gagal menghitung super admin aktif: %w",
			err,
		)
	}

	return total, nil
}

func (r *Repository) ListActiveAgents(
	ctx context.Context,
) ([]AgentSummary, error) {
	const query = `
		SELECT
			u.id,
			u.name,
			u.email,
			u.status
		FROM users u
		INNER JOIN roles r
			ON r.id = u.role_id
		WHERE
			r.code = $1
			AND u.status = $2
		ORDER BY
			u.name ASC,
			u.id ASC
	`

	rows, err := r.db.Query(
		ctx,
		query,
		RoleAgent,
		StatusActive,
	)
	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengambil daftar agent: %w",
			err,
		)
	}
	defer rows.Close()

	agents := make([]AgentSummary, 0)

	for rows.Next() {
		var agent AgentSummary

		if err := rows.Scan(
			&agent.ID,
			&agent.Name,
			&agent.Email,
			&agent.Status,
		); err != nil {
			return nil, fmt.Errorf(
				"gagal membaca data agent: %w",
				err,
			)
		}

		agents = append(agents, agent)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf(
			"gagal membaca daftar agent: %w",
			err,
		)
	}

	return agents, nil
}
