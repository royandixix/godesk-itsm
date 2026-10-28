package auth

import (
	"context"
	"errors"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"github.com/royandixix/godesk/backend/internal/user"
)

var (
	ErrInvalidCredentials = errors.New(
		"email atau password salah",
	)

	ErrAccountInactive = errors.New(
		"akun tidak aktif",
	)

	ErrInvalidPasswordLength = errors.New(
		"password harus 8 sampai 72 karakter",
	)
)

type Service struct {
	users  *user.Repository
	tokens *TokenManager
}

type RegisterInput struct {
	Name     string
	Email    string
	Password string
}

type LoginInput struct {
	Email    string
	Password string
}

type AuthResult struct {
	User  *user.User
	Token string
}

func NewService(
	users *user.Repository,
	tokens *TokenManager,
) *Service {
	return &Service{
		users:  users,
		tokens: tokens,
	}
}

func (s *Service) Register(
	ctx context.Context,
	input RegisterInput,
) (*AuthResult, error) {
	name := strings.TrimSpace(input.Name)

	email := strings.ToLower(
		strings.TrimSpace(input.Email),
	)

	if len([]byte(input.Password)) < 8 ||
		len([]byte(input.Password)) > 72 {
		return nil, ErrInvalidPasswordLength
	}

	passwordHash, err := bcrypt.GenerateFromPassword(
		[]byte(input.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return nil, err
	}

	newUser, err := s.users.CreateWithRole(
		ctx,
		name,
		email,
		string(passwordHash),
		user.RoleCustomer,
	)
	if err != nil {
		return nil, err
	}

	token, err := s.tokens.Generate(
		newUser.ID,
		newUser.RoleCode,
	)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		User:  newUser,
		Token: token,
	}, nil
}

func (s *Service) Login(
	ctx context.Context,
	input LoginInput,
) (*AuthResult, error) {
	email := strings.ToLower(
		strings.TrimSpace(input.Email),
	)

	existingUser, err := s.users.FindByEmail(
		ctx,
		email,
	)
	if err != nil {
		if errors.Is(err, user.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}

		return nil, err
	}

	if existingUser.Status != user.StatusActive {
		return nil, ErrAccountInactive
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(existingUser.PasswordHash),
		[]byte(input.Password),
	)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := s.tokens.Generate(
		existingUser.ID,
		existingUser.RoleCode,
	)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		User:  existingUser,
		Token: token,
	}, nil
}
