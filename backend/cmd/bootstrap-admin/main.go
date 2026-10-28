package main

import (
	"context"
	"errors"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"

	"github.com/royandixix/godesk/backend/internal/config"
	"github.com/royandixix/godesk/backend/internal/database"
	"github.com/royandixix/godesk/backend/internal/user"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(
			"Info: file .env tidak ditemukan",
		)
	}

	cfg := config.Load()

	name := strings.TrimSpace(
		os.Getenv("BOOTSTRAP_ADMIN_NAME"),
	)

	email := strings.ToLower(
		strings.TrimSpace(
			os.Getenv("BOOTSTRAP_ADMIN_EMAIL"),
		),
	)

	password := os.Getenv(
		"BOOTSTRAP_ADMIN_PASSWORD",
	)

	if name == "" ||
		email == "" ||
		password == "" {
		log.Fatal(
			"BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL dan BOOTSTRAP_ADMIN_PASSWORD wajib diisi",
		)
	}

	if len([]byte(password)) < 8 ||
		len([]byte(password)) > 72 {
		log.Fatal(
			"Password bootstrap admin harus 8 sampai 72 karakter",
		)
	}

	db, err := database.New(
		cfg.DatabaseURL,
	)
	if err != nil {
		log.Fatalf(
			"Database error: %v",
			err,
		)
	}
	defer db.Close()

	repository := user.NewRepository(db)

	existingUser, err := repository.FindByEmail(
		context.Background(),
		email,
	)

	if err == nil {
		log.Fatalf(
			"User dengan email %s sudah ada dengan role %s",
			existingUser.Email,
			existingUser.RoleCode,
		)
	}

	if !errors.Is(
		err,
		user.ErrUserNotFound,
	) {
		log.Fatalf(
			"Gagal memeriksa user: %v",
			err,
		)
	}

	passwordHash, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		log.Fatalf(
			"Gagal membuat password hash: %v",
			err,
		)
	}

	admin, err := repository.CreateWithRole(
		context.Background(),
		name,
		email,
		string(passwordHash),
		user.RoleSuperAdmin,
	)
	if err != nil {
		log.Fatalf(
			"Gagal membuat super admin: %v",
			err,
		)
	}

	log.Printf(
		"Super Admin berhasil dibuat: %s <%s>",
		admin.Name,
		admin.Email,
	)
}
