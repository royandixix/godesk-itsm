-- =========================================================
-- GoDesk
-- Migration 010
-- Knowledge Base Articles
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS knowledge_articles (
    id BIGSERIAL PRIMARY KEY,

    category_id BIGINT,

    author_id BIGINT NOT NULL,

    slug VARCHAR(180) NOT NULL,

    title VARCHAR(200) NOT NULL,

    summary VARCHAR(500) NOT NULL DEFAULT '',

    content TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_knowledge_articles_slug
        UNIQUE (slug),

    CONSTRAINT chk_knowledge_articles_status
        CHECK (
            status IN (
                'DRAFT',
                'PUBLISHED'
            )
        ),

    CONSTRAINT chk_knowledge_articles_title
        CHECK (
            CHAR_LENGTH(TRIM(title)) >= 5
        ),

    CONSTRAINT chk_knowledge_articles_content
        CHECK (
            CHAR_LENGTH(TRIM(content)) >= 10
        ),

    CONSTRAINT fk_knowledge_articles_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_knowledge_articles_author
        FOREIGN KEY (author_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category_id
    ON knowledge_articles(category_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_author_id
    ON knowledge_articles(author_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_status
    ON knowledge_articles(status);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_published_at
    ON knowledge_articles(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_created_at
    ON knowledge_articles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_status_published_at
    ON knowledge_articles(
        status,
        published_at DESC
    );

COMMIT;