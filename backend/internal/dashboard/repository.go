package dashboard

import (
	"context"
	"fmt"

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

func (r *Repository) Get(
	ctx context.Context,
	actor Actor,
	year int,
) (*Data, error) {
	stats, priorities, err := r.getStats(
		ctx,
		actor,
	)
	if err != nil {
		return nil, err
	}

	monthly, err := r.getMonthly(
		ctx,
		actor,
		year,
	)
	if err != nil {
		return nil, err
	}

	recentTickets, err := r.getRecentTickets(
		ctx,
		actor,
	)
	if err != nil {
		return nil, err
	}

	return &Data{
		Role:          actor.Role,
		Year:          year,
		Stats:         stats,
		Priorities:    priorities,
		Monthly:       monthly,
		RecentTickets: recentTickets,
	}, nil
}

func (r *Repository) getStats(
	ctx context.Context,
	actor Actor,
) (
	Stats,
	PriorityStats,
	error,
) {
	scopeSQL, args := buildScope(
		actor,
		1,
	)

	query := fmt.Sprintf(`
		SELECT
			COUNT(*)::bigint,
			COUNT(*) FILTER (
				WHERE t.status = 'OPEN'
			)::bigint,
			COUNT(*) FILTER (
				WHERE t.status = 'IN_PROGRESS'
			)::bigint,
			COUNT(*) FILTER (
				WHERE t.status = 'RESOLVED'
			)::bigint,
			COUNT(*) FILTER (
				WHERE t.status = 'CLOSED'
			)::bigint,
			COUNT(
				DISTINCT t.customer_id
			)::bigint,
			COUNT(*) FILTER (
				WHERE t.priority = 'LOW'
			)::bigint,
			COUNT(*) FILTER (
				WHERE t.priority = 'MEDIUM'
			)::bigint,
			COUNT(*) FILTER (
				WHERE t.priority = 'HIGH'
			)::bigint,
			COUNT(*) FILTER (
				WHERE t.priority = 'URGENT'
			)::bigint
		FROM tickets t
		WHERE %s
	`,
		scopeSQL,
	)

	var stats Stats
	var priorities PriorityStats

	err := r.db.QueryRow(
		ctx,
		query,
		args...,
	).Scan(
		&stats.Total,
		&stats.Open,
		&stats.InProgress,
		&stats.Resolved,
		&stats.Closed,
		&stats.Customers,
		&priorities.Low,
		&priorities.Medium,
		&priorities.High,
		&priorities.Urgent,
	)

	if err != nil {
		return Stats{},
			PriorityStats{},
			fmt.Errorf(
				"gagal mengambil statistik dashboard: %w",
				err,
			)
	}

	return stats,
		priorities,
		nil
}

func (r *Repository) getMonthly(
	ctx context.Context,
	actor Actor,
	year int,
) ([]MonthlyItem, error) {
	scopeSQL, scopeArgs := buildScope(
		actor,
		2,
	)

	query := fmt.Sprintf(`
		SELECT
			EXTRACT(
				MONTH FROM t.created_at
			)::int AS month,
			COUNT(*)::bigint AS total
		FROM tickets t
		WHERE
			EXTRACT(
				YEAR FROM t.created_at
			)::int = $1
			AND %s
		GROUP BY
			EXTRACT(
				MONTH FROM t.created_at
			)
		ORDER BY month
	`,
		scopeSQL,
	)

	args := []any{
		year,
	}

	args = append(
		args,
		scopeArgs...,
	)

	rows, err := r.db.Query(
		ctx,
		query,
		args...,
	)
	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal mengambil grafik dashboard: %w",
				err,
			)
	}

	defer rows.Close()

	result := make(
		[]MonthlyItem,
		12,
	)

	for index := range result {
		result[index] = MonthlyItem{
			Month: index + 1,
			Total: 0,
		}
	}

	for rows.Next() {
		var month int
		var total int64

		if err := rows.Scan(
			&month,
			&total,
		); err != nil {
			return nil,
				fmt.Errorf(
					"gagal membaca grafik dashboard: %w",
					err,
				)
		}

		if month >= 1 &&
			month <= 12 {
			result[month-1].Total =
				total
		}
	}

	if err := rows.Err(); err != nil {
		return nil,
			fmt.Errorf(
				"gagal membaca grafik dashboard: %w",
				err,
			)
	}

	return result, nil
}

func (r *Repository) getRecentTickets(
	ctx context.Context,
	actor Actor,
) ([]RecentTicket, error) {
	scopeSQL, args := buildScope(
		actor,
		1,
	)

	query := fmt.Sprintf(`
		SELECT
			t.id,
			t.ticket_number,
			t.subject,
			customer.name,
			category.name,
			t.priority,
			t.status,
			t.created_at
		FROM tickets t
		JOIN users customer
			ON customer.id = t.customer_id
		JOIN categories category
			ON category.id = t.category_id
		WHERE %s
		ORDER BY
			t.created_at DESC,
			t.id DESC
		LIMIT 5
	`,
		scopeSQL,
	)

	rows, err := r.db.Query(
		ctx,
		query,
		args...,
	)
	if err != nil {
		return nil,
			fmt.Errorf(
				"gagal mengambil tiket terbaru: %w",
				err,
			)
	}

	defer rows.Close()

	items := make(
		[]RecentTicket,
		0,
		5,
	)

	for rows.Next() {
		var item RecentTicket

		if err := rows.Scan(
			&item.ID,
			&item.TicketNumber,
			&item.Subject,
			&item.CustomerName,
			&item.CategoryName,
			&item.Priority,
			&item.Status,
			&item.CreatedAt,
		); err != nil {
			return nil,
				fmt.Errorf(
					"gagal membaca tiket terbaru: %w",
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
				"gagal membaca tiket terbaru: %w",
				err,
			)
	}

	return items, nil
}

func buildScope(
	actor Actor,
	argNumber int,
) (
	string,
	[]any,
) {
	switch actor.Role {
	case "CUSTOMER":
		return fmt.Sprintf(
				"t.customer_id = $%d",
				argNumber,
			),
			[]any{
				actor.UserID,
			}

	case "AGENT":
		return fmt.Sprintf(
				"t.assigned_agent_id = $%d",
				argNumber,
			),
			[]any{
				actor.UserID,
			}

	default:
		return "TRUE",
			nil
	}
}
