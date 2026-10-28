-- =========================================================
-- GoDesk
-- Migration 009
-- Ticket Attachments
-- =========================================================
BEGIN;
-- =========================================================
-- TABLE: ticket_attachments
-- =========================================================
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(150) NOT NULL,
    file_extension VARCHAR(20),
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ticket_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_ticket_attachments_size CHECK (size_bytes > 0),
    CONSTRAINT uq_ticket_attachments_stored_name UNIQUE (stored_name)
);
-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_uploaded_by ON ticket_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_created_at ON ticket_attachments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_created_at ON ticket_attachments(ticket_id, created_at DESC);
COMMIT;