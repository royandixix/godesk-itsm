CREATE TABLE IF NOT EXISTS ticket_activities (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE
    SET NULL,
        activity_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        old_value TEXT NULL,
        new_value TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ticket_activities_type_check CHECK (
            activity_type IN (
                'TICKET_CREATED',
                'TICKET_UPDATED',
                'STATUS_CHANGED',
                'AGENT_ASSIGNED'
            )
        )
);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket_id ON ticket_activities(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_actor_user_id ON ticket_activities(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_created_at ON ticket_activities(created_at);
CREATE TABLE IF NOT EXISTS ticket_comments (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ticket_comments_body_check CHECK (
        CHAR_LENGTH(BTRIM(body)) BETWEEN 1 AND 5000
    )
);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_user_id ON ticket_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at);