package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func New(databaseURL string) (*pgxpool.Pool, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL tidak boleh kosong")
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf(
			"gagal membaca konfigurasi database: %w",
			err,
		)
	}

	config.MaxConns = 10
	config.MinConns = 1
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(
		context.Background(),
		config,
	)
	if err != nil {
		return nil, fmt.Errorf(
			"gagal membuat connection pool: %w",
			err,
		)
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		pool.Close()

		return nil, fmt.Errorf(
			"gagal terhubung ke PostgreSQL: %w",
			err,
		)
	}

	return pool, nil
}
