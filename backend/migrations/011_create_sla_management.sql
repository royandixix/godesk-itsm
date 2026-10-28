
-- STAGE 9: SLA MANAGEMENT
-- Perhitungan SLA berlangsung 24 jam sehari.

CREATE TABLE IF NOT EXISTS sla_policies (
    priority VARCHAR(20) PRIMARY KEY
        CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
    first_response_minutes INT NOT NULL
        CHECK (first_response_minutes BETWEEN 1 AND 525600),
    resolution_minutes INT NOT NULL
        CHECK (resolution_minutes BETWEEN 1 AND 525600),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sla_resolution_gte_response
        CHECK (resolution_minutes >= first_response_minutes)
);

INSERT INTO sla_policies
    (priority, first_response_minutes, resolution_minutes)
VALUES
    ('URGENT', 15, 240),
    ('HIGH', 60, 480),
    ('MEDIUM', 240, 1440),
    ('LOW', 480, 2880)
ON CONFLICT (priority) DO NOTHING;

CREATE TABLE IF NOT EXISTS ticket_slas (
    ticket_id BIGINT PRIMARY KEY
        REFERENCES tickets(id) ON DELETE CASCADE,
    priority VARCHAR(20) NOT NULL
        REFERENCES sla_policies(priority),
    response_due_at TIMESTAMPTZ NOT NULL,
    resolution_due_at TIMESTAMPTZ NOT NULL,
    first_responded_at TIMESTAMPTZ,
    first_response_met BOOLEAN,
    first_resolved_at TIMESTAMPTZ,
    resolution_met BOOLEAN,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_slas_response_due_idx
ON ticket_slas(response_due_at)
WHERE first_responded_at IS NULL;

CREATE INDEX IF NOT EXISTS ticket_slas_resolution_due_idx
ON ticket_slas(resolution_due_at)
WHERE first_resolved_at IS NULL;

-- Masukkan tiket lama ke sistem SLA.
INSERT INTO ticket_slas (
    ticket_id, priority, response_due_at, resolution_due_at,
    first_responded_at, first_response_met,
    first_resolved_at, resolution_met
)
SELECT
    t.id,
    t.priority,
    t.created_at + make_interval(mins => p.first_response_minutes),
    t.created_at + make_interval(mins => p.resolution_minutes),
    reply.first_reply,
    CASE
        WHEN reply.first_reply IS NULL THEN NULL
        ELSE reply.first_reply <=
            t.created_at + make_interval(mins => p.first_response_minutes)
    END,
    CASE
        WHEN t.status IN ('RESOLVED','CLOSED')
            THEN COALESCE(t.resolved_at, t.closed_at)
    END,
    CASE
        WHEN t.status IN ('RESOLVED','CLOSED')
             AND COALESCE(t.resolved_at, t.closed_at) IS NOT NULL
            THEN COALESCE(t.resolved_at, t.closed_at) <=
                t.created_at + make_interval(mins => p.resolution_minutes)
    END
FROM tickets t
JOIN sla_policies p ON p.priority = t.priority
LEFT JOIN LATERAL (
    SELECT MIN(c.created_at) AS first_reply
    FROM ticket_comments c
    JOIN users u ON u.id = c.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE c.ticket_id = t.id
      AND r.code IN ('AGENT','MANAGER','SUPER_ADMIN')
) reply ON TRUE
ON CONFLICT (ticket_id) DO NOTHING;

-- Otomatis membuat SLA ketika tiket dibuat.
-- Perubahan prioritas akan menghitung kembali deadline.

CREATE OR REPLACE FUNCTION godesk_sync_ticket_sla()
RETURNS TRIGGER AS $$
DECLARE
    policy sla_policies%ROWTYPE;
    event_resolved_at TIMESTAMPTZ;
    replace_snapshot BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        replace_snapshot := TRUE;
    ELSE
        replace_snapshot := NEW.priority IS DISTINCT FROM OLD.priority;
    END IF;

    SELECT * INTO STRICT policy
    FROM sla_policies
    WHERE priority = NEW.priority;

    IF replace_snapshot THEN
        INSERT INTO ticket_slas (
            ticket_id, priority, response_due_at, resolution_due_at
        )
        VALUES (
            NEW.id,
            NEW.priority,
            NEW.created_at + make_interval(mins => policy.first_response_minutes),
            NEW.created_at + make_interval(mins => policy.resolution_minutes)
        )
        ON CONFLICT (ticket_id) DO UPDATE SET
            priority = EXCLUDED.priority,
            response_due_at = EXCLUDED.response_due_at,
            resolution_due_at = EXCLUDED.resolution_due_at,
            first_response_met = CASE
                WHEN ticket_slas.first_responded_at IS NULL THEN NULL
                ELSE ticket_slas.first_responded_at <= EXCLUDED.response_due_at
            END,
            resolution_met = CASE
                WHEN ticket_slas.first_resolved_at IS NULL THEN NULL
                ELSE ticket_slas.first_resolved_at <= EXCLUDED.resolution_due_at
            END,
            updated_at = NOW();
    END IF;

    IF NEW.status IN ('RESOLVED', 'CLOSED') THEN
        event_resolved_at := COALESCE(
            NEW.resolved_at, NEW.closed_at, NOW()
        );

        UPDATE ticket_slas SET
            first_resolved_at = COALESCE(first_resolved_at, event_resolved_at),
            resolution_met = COALESCE(
                resolution_met,
                event_resolved_at <= resolution_due_at
            ),
            updated_at = NOW()
        WHERE ticket_id = NEW.id
          AND first_resolved_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_godesk_ticket_sla ON tickets;

CREATE TRIGGER trg_godesk_ticket_sla
AFTER INSERT OR UPDATE OF priority, status, resolved_at, closed_at
ON tickets
FOR EACH ROW EXECUTE FUNCTION godesk_sync_ticket_sla();

-- Respons pertama dihitung dari komentar Agent/Manager/Admin.

CREATE OR REPLACE FUNCTION godesk_record_first_sla_response()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.id = NEW.user_id
          AND r.code IN ('AGENT','MANAGER','SUPER_ADMIN')
    ) THEN
        UPDATE ticket_slas SET
            first_responded_at = NEW.created_at,
            first_response_met = NEW.created_at <= response_due_at,
            updated_at = NOW()
        WHERE ticket_id = NEW.ticket_id
          AND first_responded_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_godesk_first_sla_response
ON ticket_comments;

CREATE TRIGGER trg_godesk_first_sla_response
AFTER INSERT ON ticket_comments
FOR EACH ROW EXECUTE FUNCTION godesk_record_first_sla_response();

-- Tambahkan jenis notifikasi SLA.

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
    'AGENT_ASSIGNED',
    'STATUS_CHANGED',
    'COMMENT_ADDED',
    'SYSTEM',
    'SLA_RESPONSE_BREACH',
    'SLA_RESOLUTION_BREACH'
));

CREATE UNIQUE INDEX IF NOT EXISTS sla_notifications_once_idx
ON notifications (recipient_user_id, ticket_id, type)
WHERE type IN ('SLA_RESPONSE_BREACH','SLA_RESOLUTION_BREACH');
