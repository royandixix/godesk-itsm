package main

import (
	"context"
	"errors"
	"log"
	"strings"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"

	"github.com/royandixix/godesk/backend/internal/config"
	"github.com/royandixix/godesk/backend/internal/database"
	"github.com/royandixix/godesk/backend/internal/user"
)

type BootstrapUser struct {
	Name     string
	Email    string
	Password string
	Role     string
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(
			"Info: file .env tidak ditemukan",
		)
	}

	cfg := config.Load()

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

	repository :=
		user.NewRepository(
			db,
		)

	users := []BootstrapUser{
		{
			Name:     "GoDesk Agent",
			Email:    "agent@godesk.local",
			Password: "password1234",
			Role:     user.RoleAgent,
		},
		{
			Name:     "GoDesk Manager",
			Email:    "manager@godesk.local",
			Password: "password1234",
			Role:     user.RoleManager,
		},
	}

	for _, bootstrapUser := range users {
		if err := ensureUser(
			repository,
			bootstrapUser,
		); err != nil {
			log.Fatalf(
				"Gagal bootstrap %s: %v",
				bootstrapUser.Email,
				err,
			)
		}
	}

	log.Println(
		"Bootstrap user GoDesk selesai.",
	)

	log.Println(
		"Agent  : agent@godesk.local",
	)

	log.Println(
		"Manager: manager@godesk.local",
	)
}

func ensureUser(
	repository *user.Repository,
	bootstrapUser BootstrapUser,
) error {
	ctx :=
		context.Background()

	name :=
		strings.TrimSpace(
			bootstrapUser.Name,
		)

	email :=
		strings.ToLower(
			strings.TrimSpace(
				bootstrapUser.Email,
			),
		)

	password :=
		bootstrapUser.Password

	role :=
		strings.TrimSpace(
			bootstrapUser.Role,
		)

	if name == "" {
		return errors.New(
			"nama user wajib diisi",
		)
	}

	if email == "" {
		return errors.New(
			"email user wajib diisi",
		)
	}

	if role == "" {
		return errors.New(
			"role user wajib diisi",
		)
	}

	if len(
		[]byte(
			password,
		),
	) < 8 ||
		len(
			[]byte(
				password,
			),
		) > 72 {
		return errors.New(
			"password harus 8 sampai 72 karakter",
		)
	}

	existingUser, err :=
		repository.FindByEmail(
			ctx,
			email,
		)

	if err == nil {
		if existingUser.RoleCode !=
			role {
			return errors.New(
				"user sudah ada tetapi role tidak sesuai: " +
					existingUser.RoleCode,
			)
		}

		log.Printf(
			"User sudah ada, dilewati: %s <%s> [%s]",
			existingUser.Name,
			existingUser.Email,
			existingUser.RoleCode,
		)

		return nil
	}

	if !errors.Is(
		err,
		user.ErrUserNotFound,
	) {
		return err
	}

	passwordHash, err :=
		bcrypt.GenerateFromPassword(
			[]byte(
				password,
			),
			bcrypt.DefaultCost,
		)

	if err != nil {
		return err
	}

	createdUser, err :=
		repository.CreateWithRole(
			ctx,
			name,
			email,
			string(
				passwordHash,
			),
			role,
		)

	if err != nil {
		return err
	}

	log.Printf(
		"User berhasil dibuat: %s <%s> [%s]",
		createdUser.Name,
		createdUser.Email,
		createdUser.RoleCode,
	)

	return nil
}
