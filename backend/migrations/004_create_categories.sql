CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique_idx
    ON categories (LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_unique_idx
    ON categories (LOWER(slug));

CREATE INDEX IF NOT EXISTS categories_is_active_idx
    ON categories (is_active);