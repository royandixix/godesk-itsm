package config

import (
	"os"
	"strconv"
)

type Config struct {
	AppName     string
	AppEnv      string
	AppPort     string
	DatabaseURL string
	FrontendURL string

	JWTSecret   string
	JWTIssuer   string
	JWTTTLHours int
	CookieName  string

	AttachmentStoragePath string
	AttachmentMaxSizeMB   int
}

func Load() Config {
	return Config{
		AppName:     getEnv("APP_NAME", "GoDesk"),
		AppEnv:      getEnv("APP_ENV", "development"),
		AppPort:     getEnv("APP_PORT", "8082"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		FrontendURL: getEnv(
			"FRONTEND_URL",
			"http://localhost:3000",
		),

		JWTSecret: getEnv(
			"JWT_SECRET",
			"",
		),
		JWTIssuer: getEnv(
			"JWT_ISSUER",
			"godesk-api",
		),
		JWTTTLHours: getEnvInt(
			"JWT_TTL_HOURS",
			12,
		),
		CookieName: getEnv(
			"COOKIE_NAME",
			"godesk_token",
		),

		AttachmentStoragePath: getEnv(
			"ATTACHMENT_STORAGE_PATH",
			"storage/attachments",
		),
		AttachmentMaxSizeMB: getEnvInt(
			"ATTACHMENT_MAX_SIZE_MB",
			10,
		),
	}
}

func getEnv(
	key string,
	fallback string,
) string {
	value := os.Getenv(key)

	if value == "" {
		return fallback
	}

	return value
}

func getEnvInt(
	key string,
	fallback int,
) int {
	value := os.Getenv(key)

	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}
