package reports

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const conditions = `
t.created_at >= $1
AND t.created_at < $2
AND ($3::text = '' OR t.status = $3)
AND ($4::text = '' OR t.priority = $4)
AND ($5::bigint = 0 OR t.category_id = $5)
AND ($6::bigint = 0 OR t.assigned_agent_id = $6)
`

const scope = `FROM tickets t WHERE ` + conditions

func args(f Filter) []any {
	return []any{
		f.From,
		f.ToExclusive,
		f.Status,
		f.Priority,
		f.CategoryID,
		f.AgentID,
	}
}

func (r *Repository) Get(ctx context.Context, f Filter) (*Data, error) {
	d := &Data{
		From:       f.FromDate,
		To:         f.ToDate,
		Trend:      []CountItem{},
		Statuses:   []CountItem{},
		Priorities: []CountItem{},
		Categories: []CountItem{},
		Agents:     []AgentItem{},
		Tickets:    []TicketItem{},
		Limit:      f.Limit,
		Offset:     f.Offset,
	}

	summaryQuery := `
		SELECT
			COUNT(*)::bigint,
			COUNT(*) FILTER (WHERE t.status = 'OPEN')::bigint,
			COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS')::bigint,
			COUNT(*) FILTER (WHERE t.status = 'RESOLVED')::bigint,
			COUNT(*) FILTER (WHERE t.status = 'CLOSED')::bigint,
			COUNT(DISTINCT t.customer_id)::bigint,
			COALESCE(
				ROUND(
					AVG(
						EXTRACT(
							EPOCH FROM (
								COALESCE(t.resolved_at, t.closed_at)
								- t.created_at
							)
						) / 3600
					) FILTER (
						WHERE COALESCE(t.resolved_at, t.closed_at)
						>= t.created_at
					),
					1
				),
				0
			)::float8
	` + scope

	err := r.db.QueryRow(ctx, summaryQuery, args(f)...).Scan(
		&d.Summary.Total,
		&d.Summary.Open,
		&d.Summary.InProgress,
		&d.Summary.Resolved,
		&d.Summary.Closed,
		&d.Summary.Customers,
		&d.Summary.AverageResolutionHours,
	)
	if err != nil {
		return nil, fmt.Errorf("ringkasan: %w", err)
	}

	d.Total = d.Summary.Total

	trendQuery := `
		SELECT
			TO_CHAR(
				t.created_at AT TIME ZONE 'Asia/Makassar',
				'YYYY-MM-DD'
			),
			COUNT(*)::bigint
	` + scope + ` GROUP BY 1 ORDER BY 1`

	rows, err := r.db.Query(ctx, trendQuery, args(f)...)
	if err != nil {
		return nil, fmt.Errorf("tren: %w", err)
	}

	trendMap := map[string]int64{}

	for rows.Next() {
		var date string
		var count int64

		if err = rows.Scan(&date, &count); err != nil {
			break
		}
		trendMap[date] = count
	}

	if err == nil {
		err = rows.Err()
	}
	rows.Close()

	if err != nil {
		return nil, fmt.Errorf("tren: %w", err)
	}

	for date := f.From; date.Before(f.ToExclusive); date = date.AddDate(0, 0, 1) {
		key := date.Format("2006-01-02")
		d.Trend = append(d.Trend, CountItem{
			Name:  key,
			Total: trendMap[key],
		})
	}

	d.Statuses, err = r.counts(
		ctx,
		`SELECT t.status, COUNT(*)::bigint `+
			scope+` GROUP BY t.status ORDER BY t.status`,
		f,
	)
	if err != nil {
		return nil, fmt.Errorf("status: %w", err)
	}

	d.Priorities, err = r.counts(
		ctx,
		`SELECT t.priority, COUNT(*)::bigint `+
			scope+` GROUP BY t.priority ORDER BY t.priority`,
		f,
	)
	if err != nil {
		return nil, fmt.Errorf("prioritas: %w", err)
	}

	categoryQuery := `
		SELECT c.name, COUNT(*)::bigint
		FROM tickets t
		JOIN categories c ON c.id = t.category_id
		WHERE ` + conditions + `
		GROUP BY c.id, c.name
		ORDER BY COUNT(*) DESC, c.name
		LIMIT 100
	`

	d.Categories, err = r.counts(ctx, categoryQuery, f)
	if err != nil {
		return nil, fmt.Errorf("kategori: %w", err)
	}

	if err = r.getSLA(ctx, f, &d.SLA); err != nil {
		return nil, fmt.Errorf("SLA: %w", err)
	}

	if n := d.SLA.ResponseMet + d.SLA.ResponseBreached; n > 0 {
		d.SLA.ResponseRate = float64(d.SLA.ResponseMet) * 100 / float64(n)
	}

	if n := d.SLA.ResolutionMet + d.SLA.ResolutionBreached; n > 0 {
		d.SLA.ResolutionRate = float64(d.SLA.ResolutionMet) * 100 / float64(n)
	}

	d.Agents, err = r.getAgents(ctx, f)
	if err != nil {
		return nil, fmt.Errorf("agent: %w", err)
	}

	d.Tickets, err = r.GetTickets(ctx, f, f.Limit, f.Offset)
	if err != nil {
		return nil, fmt.Errorf("tiket: %w", err)
	}

	return d, nil
}

func (r *Repository) counts(
	ctx context.Context,
	query string,
	f Filter,
) ([]CountItem, error) {
	rows, err := r.db.Query(ctx, query, args(f)...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []CountItem{}

	for rows.Next() {
		var item CountItem
		if err := rows.Scan(&item.Name, &item.Total); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) getSLA(
	ctx context.Context,
	f Filter,
	s *SLA,
) error {
	query := `
		SELECT
			COUNT(*) FILTER (
				WHERE sl.first_response_met IS TRUE
			)::bigint,
			COUNT(*) FILTER (
				WHERE sl.first_response_met IS FALSE
				OR (
					sl.first_responded_at IS NULL
					AND NOW() >= sl.response_due_at
				)
			)::bigint,
			COUNT(*) FILTER (
				WHERE sl.resolution_met IS TRUE
			)::bigint,
			COUNT(*) FILTER (
				WHERE sl.resolution_met IS FALSE
				OR (
					sl.first_resolved_at IS NULL
					AND NOW() >= sl.resolution_due_at
				)
			)::bigint
		FROM tickets t
		LEFT JOIN ticket_slas sl ON sl.ticket_id = t.id
		WHERE ` + conditions

	return r.db.QueryRow(ctx, query, args(f)...).Scan(
		&s.ResponseMet,
		&s.ResponseBreached,
		&s.ResolutionMet,
		&s.ResolutionBreached,
	)
}

func (r *Repository) getAgents(
	ctx context.Context,
	f Filter,
) ([]AgentItem, error) {
	query := `
		SELECT
			a.id,
			a.name,
			COUNT(*)::bigint,
			COUNT(*) FILTER (
				WHERE t.status IN ('RESOLVED', 'CLOSED')
			)::bigint,
			COUNT(*) FILTER (
				WHERE sl.resolution_met IS TRUE
			)::bigint,
			COUNT(*) FILTER (
				WHERE sl.resolution_met IS FALSE
				OR (
					sl.first_resolved_at IS NULL
					AND NOW() >= sl.resolution_due_at
				)
			)::bigint
		FROM tickets t
		JOIN users a ON a.id = t.assigned_agent_id
		LEFT JOIN ticket_slas sl ON sl.ticket_id = t.id
		WHERE ` + conditions + `
		GROUP BY a.id, a.name
		ORDER BY COUNT(*) DESC, a.name
		LIMIT 100
	`

	rows, err := r.db.Query(ctx, query, args(f)...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []AgentItem{}

	for rows.Next() {
		var item AgentItem
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Total,
			&item.Completed,
			&item.SlaMet,
			&item.SlaBreached,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) GetTickets(
	ctx context.Context,
	f Filter,
	limit, offset int,
) ([]TicketItem, error) {
	query := `
		SELECT
			t.id,
			t.ticket_number,
			t.subject,
			c.name,
			customer.name,
			COALESCE(agent.name, 'Belum ditugaskan'),
			t.status,
			t.priority,
			CASE
				WHEN sl.ticket_id IS NULL THEN 'NO_DATA'
				WHEN sl.first_response_met IS TRUE THEN 'MET'
				WHEN sl.first_response_met IS FALSE
					OR (
						sl.first_responded_at IS NULL
						AND NOW() >= sl.response_due_at
					) THEN 'BREACHED'
				ELSE 'PENDING'
			END,
			CASE
				WHEN sl.ticket_id IS NULL THEN 'NO_DATA'
				WHEN sl.resolution_met IS TRUE THEN 'MET'
				WHEN sl.resolution_met IS FALSE
					OR (
						sl.first_resolved_at IS NULL
						AND NOW() >= sl.resolution_due_at
					) THEN 'BREACHED'
				ELSE 'PENDING'
			END,
			t.created_at
		FROM tickets t
		JOIN categories c ON c.id = t.category_id
		JOIN users customer ON customer.id = t.customer_id
		LEFT JOIN users agent ON agent.id = t.assigned_agent_id
		LEFT JOIN ticket_slas sl ON sl.ticket_id = t.id
		WHERE ` + conditions + `
		ORDER BY t.created_at DESC, t.id DESC
		LIMIT $7 OFFSET $8
	`

	params := append(args(f), limit, offset)

	rows, err := r.db.Query(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []TicketItem{}

	for rows.Next() {
		var item TicketItem

		if err := rows.Scan(
			&item.ID,
			&item.Number,
			&item.Subject,
			&item.Category,
			&item.Customer,
			&item.Agent,
			&item.Status,
			&item.Priority,
			&item.SlaResponse,
			&item.SlaResolution,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}

		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *Repository) Options(ctx context.Context) (*Options, error) {
	output := &Options{
		Categories: []Option{},
		Agents:     []Option{},
	}

	rows, err := r.db.Query(
		ctx,
		`SELECT id, name FROM categories ORDER BY name`,
	)
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		var item Option
		if err = rows.Scan(&item.ID, &item.Name); err != nil {
			break
		}
		output.Categories = append(output.Categories, item)
	}
	if err == nil {
		err = rows.Err()
	}
	rows.Close()
	if err != nil {
		return nil, err
	}

	rows, err = r.db.Query(ctx, `
		SELECT u.id, u.name
		FROM users u
		JOIN roles r ON r.id = u.role_id
		WHERE r.code = 'AGENT'
		ORDER BY u.name
	`)
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		var item Option
		if err = rows.Scan(&item.ID, &item.Name); err != nil {
			break
		}
		output.Agents = append(output.Agents, item)
	}
	if err == nil {
		err = rows.Err()
	}
	rows.Close()
	if err != nil {
		return nil, err
	}

	return output, nil
}
