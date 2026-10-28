package ticket

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New(
	"ticket tidak ditemukan",
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

func (r *Repository) NextID(
	ctx context.Context,
) (int64, error) {
	const query = `
		SELECT nextval('tickets_id_seq')
	`

	var id int64

	if err := r.db.QueryRow(
		ctx,
		query,
	).Scan(&id); err != nil {
		return 0, fmt.Errorf(
			"gagal membuat ID ticket: %w",
			err,
		)
	}

	return id, nil
}

func (r *Repository) Create(
	ctx context.Context,
	id int64,
	ticketNumber string,
	customerID int64,
	input CreateInput,
) (*Ticket, error) {
	const query = `
		INSERT INTO tickets (
			id,
			ticket_number,
			customer_id,
			category_id,
			subject,
			description,
			priority,
			status
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
			$6,
			$7,
			'OPEN'
		)
	`

	_, err := r.db.Exec(
		ctx,
		query,
		id,
		ticketNumber,
		customerID,
		input.CategoryID,
		input.Subject,
		input.Description,
		input.Priority,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"gagal membuat ticket: %w",
			err,
		)
	}

	return r.FindByID(
		ctx,
		id,
	)
}

func (r *Repository) FindByID(
	ctx context.Context,
	id int64,
) (*Ticket, error) {
	const query = `
		SELECT
			t.id,
			t.ticket_number,
			t.customer_id,
			customer.name,
			customer.email,
			t.assigned_agent_id,
			agent.name,
			t.category_id,
			category.name,
			category.slug,
			t.subject,
			t.description,
			t.priority,
			t.status,
			t.resolved_at,
			t.closed_at,
			t.created_at,
			t.updated_at
		FROM tickets t
		JOIN users customer
			ON customer.id = t.customer_id
		JOIN categories category
			ON category.id = t.category_id
		LEFT JOIN users agent
			ON agent.id = t.assigned_agent_id
		WHERE t.id = $1
	`

	item := &Ticket{}

	err := r.db.QueryRow(
		ctx,
		query,
		id,
	).Scan(
		&item.ID,
		&item.TicketNumber,
		&item.CustomerID,
		&item.CustomerName,
		&item.CustomerEmail,
		&item.AssignedAgentID,
		&item.AssignedAgent,
		&item.CategoryID,
		&item.CategoryName,
		&item.CategorySlug,
		&item.Subject,
		&item.Description,
		&item.Priority,
		&item.Status,
		&item.ResolvedAt,
		&item.ClosedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)

	if errors.Is(
		err,
		pgx.ErrNoRows,
	) {
		return nil, ErrNotFound
	}

	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengambil ticket: %w",
			err,
		)
	}

	return item, nil
}

func (r *Repository) List(
	ctx context.Context,
	actor Actor,
	filter ListFilter,
) (*ListResult, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	if filter.Limit > 100 {
		filter.Limit = 100
	}

	if filter.Offset < 0 {
		filter.Offset = 0
	}

	where := []string{
		"1 = 1",
	}

	args := make(
		[]any,
		0,
		8,
	)

	argNumber := 1

	switch actor.Role {
	case "CUSTOMER":
		where = append(
			where,
			fmt.Sprintf(
				"t.customer_id = $%d",
				argNumber,
			),
		)

		args = append(
			args,
			actor.UserID,
		)

		argNumber++

	case "AGENT":
		where = append(
			where,
			fmt.Sprintf(
				"t.assigned_agent_id = $%d",
				argNumber,
			),
		)

		args = append(
			args,
			actor.UserID,
		)

		argNumber++
	}

	if filter.Status != "" {
		where = append(
			where,
			fmt.Sprintf(
				"t.status = $%d",
				argNumber,
			),
		)

		args = append(
			args,
			filter.Status,
		)

		argNumber++
	}

	if filter.Priority != "" {
		where = append(
			where,
			fmt.Sprintf(
				"t.priority = $%d",
				argNumber,
			),
		)

		args = append(
			args,
			filter.Priority,
		)

		argNumber++
	}

	if filter.CategoryID > 0 {
		where = append(
			where,
			fmt.Sprintf(
				"t.category_id = $%d",
				argNumber,
			),
		)

		args = append(
			args,
			filter.CategoryID,
		)

		argNumber++
	}

	if strings.TrimSpace(
		filter.Search,
	) != "" {
		where = append(
			where,
			fmt.Sprintf(
				`(
					t.ticket_number ILIKE $%d
					OR t.subject ILIKE $%d
					OR customer.name ILIKE $%d
					OR customer.email ILIKE $%d
				)`,
				argNumber,
				argNumber,
				argNumber,
				argNumber,
			),
		)

		args = append(
			args,
			"%"+
				strings.TrimSpace(
					filter.Search,
				)+
				"%",
		)

		argNumber++
	}

	whereSQL := strings.Join(
		where,
		" AND ",
	)

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM tickets t
		JOIN users customer
			ON customer.id = t.customer_id
		WHERE %s
	`, whereSQL)

	var total int64

	if err := r.db.QueryRow(
		ctx,
		countQuery,
		args...,
	).Scan(&total); err != nil {
		return nil, fmt.Errorf(
			"gagal menghitung ticket: %w",
			err,
		)
	}

	listArgs := append(
		[]any{},
		args...,
	)

	limitArg := argNumber
	offsetArg := argNumber + 1

	listArgs = append(
		listArgs,
		filter.Limit,
		filter.Offset,
	)

	listQuery := fmt.Sprintf(`
		SELECT
			t.id,
			t.ticket_number,
			t.customer_id,
			customer.name,
			customer.email,
			t.assigned_agent_id,
			agent.name,
			t.category_id,
			category.name,
			category.slug,
			t.subject,
			t.description,
			t.priority,
			t.status,
			t.resolved_at,
			t.closed_at,
			t.created_at,
			t.updated_at
		FROM tickets t
		JOIN users customer
			ON customer.id = t.customer_id
		JOIN categories category
			ON category.id = t.category_id
		LEFT JOIN users agent
			ON agent.id = t.assigned_agent_id
		WHERE %s
		ORDER BY t.created_at DESC, t.id DESC
		LIMIT $%d
		OFFSET $%d
	`,
		whereSQL,
		limitArg,
		offsetArg,
	)

	rows, err := r.db.Query(
		ctx,
		listQuery,
		listArgs...,
	)

	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengambil daftar ticket: %w",
			err,
		)
	}

	defer rows.Close()

	items := make(
		[]Ticket,
		0,
	)

	for rows.Next() {
		var item Ticket

		if err := rows.Scan(
			&item.ID,
			&item.TicketNumber,
			&item.CustomerID,
			&item.CustomerName,
			&item.CustomerEmail,
			&item.AssignedAgentID,
			&item.AssignedAgent,
			&item.CategoryID,
			&item.CategoryName,
			&item.CategorySlug,
			&item.Subject,
			&item.Description,
			&item.Priority,
			&item.Status,
			&item.ResolvedAt,
			&item.ClosedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf(
				"gagal membaca ticket: %w",
				err,
			)
		}

		items = append(
			items,
			item,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf(
			"gagal membaca daftar ticket: %w",
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
	input UpdateInput,
) (*Ticket, error) {
	const query = `
		UPDATE tickets
		SET
			category_id = COALESCE(
				$2,
				category_id
			),
			subject = COALESCE(
				$3,
				subject
			),
			description = COALESCE(
				$4,
				description
			),
			priority = COALESCE(
				$5,
				priority
			),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id
	`

	var updatedID int64

	err := r.db.QueryRow(
		ctx,
		query,
		id,
		input.CategoryID,
		input.Subject,
		input.Description,
		input.Priority,
	).Scan(
		&updatedID,
	)

	if errors.Is(
		err,
		pgx.ErrNoRows,
	) {
		return nil, ErrNotFound
	}

	if err != nil {
		return nil, fmt.Errorf(
			"gagal memperbarui ticket: %w",
			err,
		)
	}

	return r.FindByID(
		ctx,
		updatedID,
	)
}

func (r *Repository) UpdateStatus(
	ctx context.Context,
	id int64,
	status Status,
) (*Ticket, error) {
	const query = `
		UPDATE tickets
		SET
			status = $2,

			resolved_at = CASE
				WHEN $3::text = 'RESOLVED'
					THEN COALESCE(
						resolved_at,
						NOW()
					)
				WHEN $3::text IN (
					'OPEN',
					'IN_PROGRESS'
				)
					THEN NULL
				ELSE resolved_at
			END,

			closed_at = CASE
				WHEN $3::text = 'CLOSED'
					THEN COALESCE(
						closed_at,
						NOW()
					)
				WHEN $3::text <> 'CLOSED'
					THEN NULL
				ELSE closed_at
			END,

			updated_at = NOW()

		WHERE id = $1
		RETURNING id
	`

	var updatedID int64

	statusText := string(status)

	err := r.db.QueryRow(
		ctx,
		query,
		id,
		status,
		statusText,
	).Scan(
		&updatedID,
	)

	if errors.Is(
		err,
		pgx.ErrNoRows,
	) {
		return nil, ErrNotFound
	}

	if err != nil {
		return nil, fmt.Errorf(
			"gagal memperbarui status ticket: %w",
			err,
		)
	}

	return r.FindByID(
		ctx,
		updatedID,
	)
}

func (r *Repository) AssignAgent(
	ctx context.Context,
	id int64,
	agentID int64,
) (*Ticket, error) {
	const query = `
		UPDATE tickets
		SET
			assigned_agent_id = $2,

			status = CASE
				WHEN status = 'OPEN'
					THEN 'IN_PROGRESS'
				ELSE status
			END,

			updated_at = NOW()

		WHERE id = $1
		RETURNING id
	`

	var updatedID int64

	err := r.db.QueryRow(
		ctx,
		query,
		id,
		agentID,
	).Scan(
		&updatedID,
	)

	if errors.Is(
		err,
		pgx.ErrNoRows,
	) {
		return nil, ErrNotFound
	}

	if err != nil {
		return nil, fmt.Errorf(
			"gagal assign agent: %w",
			err,
		)
	}

	return r.FindByID(
		ctx,
		updatedID,
	)
}

func (r *Repository) Delete(
	ctx context.Context,
	id int64,
) error {
	const query = `
		DELETE FROM tickets
		WHERE id = $1
	`

	result, err := r.db.Exec(
		ctx,
		query,
		id,
	)

	if err != nil {
		return fmt.Errorf(
			"gagal menghapus ticket: %w",
			err,
		)
	}

	if result.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) FindActiveAgent(
	ctx context.Context,
	id int64,
) (*AgentInfo, error) {
	const query = `
		SELECT
			u.id,
			u.name,
			u.email,
			r.code,
			u.status
		FROM users u
		JOIN roles r
			ON r.id = u.role_id
		WHERE u.id = $1
		  AND r.code = 'AGENT'
		  AND u.status = 'ACTIVE'
	`

	var agent AgentInfo

	err := r.db.QueryRow(
		ctx,
		query,
		id,
	).Scan(
		&agent.ID,
		&agent.Name,
		&agent.Email,
		&agent.Role,
		&agent.Status,
	)

	if errors.Is(
		err,
		pgx.ErrNoRows,
	) {
		return nil, nil
	}

	if err != nil {
		return nil, fmt.Errorf(
			"gagal mencari agent: %w",
			err,
		)
	}

	return &agent, nil
}
