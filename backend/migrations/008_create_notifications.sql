CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE
    SET NULL,
        ticket_id BIGINT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT notifications_type_check CHECK (
            type IN (
                'AGENT_ASSIGNED',
                'STATUS_CHANGED',
                'COMMENT_ADDED',
                'SYSTEM'
            )
        )
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_user_id ON notifications(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_ticket_id ON notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);