
package sla

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Monitor(ctx context.Context, db *pgxpool.Pool) {
	check := func() {
		jobCtx, cancel := context.WithTimeout(
			ctx,
			25*time.Second,
		)
		defer cancel()

		if err := notifyBreaches(jobCtx, db); err != nil {
			if ctx.Err() == nil {
				log.Printf(
					"[SLA] Gagal memeriksa pelanggaran: %v",
					err,
				)
			}
		}
	}

	check()

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return

		case <-ticker.C:
			check()
		}
	}
}

func notifyBreaches(
	ctx context.Context,
	db *pgxpool.Pool,
) error {
	_, err := db.Exec(ctx, `
		INSERT INTO notifications (
			recipient_user_id,
			ticket_id,
			type,
			title,
			message
		)
		SELECT DISTINCT
			recipients.id,
			t.id,
			kinds.type,
			kinds.title,
			(
				'Tiket ' || t.ticket_number ||
				' melewati batas ' || kinds.label || ' SLA.'
			)
		FROM ticket_slas s
		JOIN tickets t ON t.id = s.ticket_id

		CROSS JOIN LATERAL (
			VALUES
			(
				'SLA_RESPONSE_BREACH'::varchar,
				'SLA Respons Terlewat'::varchar,
				'respons'::text,
				(
					s.first_response_met = FALSE
					OR (
						s.first_responded_at IS NULL
						AND NOW() >= s.response_due_at
					)
				)
			),
			(
				'SLA_RESOLUTION_BREACH'::varchar,
				'SLA Penyelesaian Terlewat'::varchar,
				'penyelesaian'::text,
				(
					s.resolution_met = FALSE
					OR (
						s.first_resolved_at IS NULL
						AND NOW() >= s.resolution_due_at
					)
				)
			)
		) kinds(type, title, label, breached)

		JOIN users recipients
			ON recipients.status = 'ACTIVE'

		JOIN roles role
			ON role.id = recipients.role_id

		WHERE kinds.breached
		  AND (
				role.code IN ('SUPER_ADMIN', 'MANAGER')
				OR (
					role.code = 'AGENT'
					AND recipients.id = t.assigned_agent_id
				)
		  )

		ON CONFLICT (
			recipient_user_id,
			ticket_id,
			type
		)
		WHERE type IN (
			'SLA_RESPONSE_BREACH',
			'SLA_RESOLUTION_BREACH'
		)
		DO NOTHING
	`)

	return err
}
