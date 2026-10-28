CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_number VARCHAR(40) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    assigned_agent_id BIGINT REFERENCES users(id) ON UPDATE CASCADE ON DELETE
    SET NULL,
        category_id BIGINT NOT NULL REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        subject VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (
            priority IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'URGENT'
            )
        ),
        status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (
            status IN (
                'OPEN',
                'IN_PROGRESS',
                'RESOLVED',
                'CLOSED'
            )
        ),
        resolved_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tickets_customer_id_idx ON tickets (customer_id);
CREATE INDEX IF NOT EXISTS tickets_assigned_agent_id_idx ON tickets (assigned_agent_id);
CREATE INDEX IF NOT EXISTS tickets_category_id_idx ON tickets (category_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets (status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets (priority);
CREATE INDEX IF NOT EXISTS tickets_created_at_idx ON tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_customer_status_idx ON tickets (customer_id, status);
CREATE INDEX IF NOT EXISTS tickets_agent_status_idx ON tickets (assigned_agent_id, status);