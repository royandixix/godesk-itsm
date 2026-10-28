package user

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidName = errors.New(
		"nama harus 3 sampai 120 karakter",
	)

	ErrInvalidEmail = errors.New(
		"format email tidak valid",
	)

	ErrInvalidRole = errors.New(
		"role tidak valid",
	)

	ErrInvalidStatus = errors.New(
		"status tidak valid",
	)

	ErrInvalidPassword = errors.New(
		"password harus 8 sampai 72 karakter",
	)

	ErrCannotChangeOwnRole = errors.New(
		"anda tidak dapat mengubah role akun sendiri",
	)

	ErrCannotDeactivateSelf = errors.New(
		"anda tidak dapat menonaktifkan akun sendiri",
	)

	ErrLastActiveSuperAdmin = errors.New(
		"minimal satu Super Administrator harus tetap aktif",
	)
)

var emailPattern = regexp.MustCompile(
	`^[^\s@]+@[^\s@]+\.[^\s@]+$`,
)

type Service struct {
	repository *Repository
}

type CreateInput struct {
	Name     string
	Email    string
	Password string
	Role     string
}

type UpdateInput struct {
	Name     *string `json:"name"`
	Email    *string `json:"email"`
	Password *string `json:"password"`
	Role     *string `json:"role"`
}

func NewService(
	repository *Repository,
) *Service {
	return &Service{
		repository: repository,
	}
}

func (s *Service) List(
	ctx context.Context,
	filter ListFilter,
) (*ListResult, error) {
	filter.Role = strings.ToUpper(
		strings.TrimSpace(filter.Role),
	)

	filter.Status = strings.ToUpper(
		strings.TrimSpace(filter.Status),
	)

	filter.Search = strings.TrimSpace(
		filter.Search,
	)

	if filter.Role != "" &&
		!isValidRole(filter.Role) {
		return nil, ErrInvalidRole
	}

	if filter.Status != "" &&
		!isValidStatus(filter.Status) {
		return nil, ErrInvalidStatus
	}

	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	if filter.Limit > 100 {
		filter.Limit = 100
	}

	if filter.Offset < 0 {
		filter.Offset = 0
	}

	return s.repository.List(
		ctx,
		filter,
	)
}

func (s *Service) GetByID(
	ctx context.Context,
	id int64,
) (*User, error) {
	if id <= 0 {
		return nil, ErrUserNotFound
	}

	return s.repository.FindByID(
		ctx,
		id,
	)
}

func (s *Service) Create(
	ctx context.Context,
	input CreateInput,
) (*User, error) {
	name := strings.TrimSpace(input.Name)

	email := strings.ToLower(
		strings.TrimSpace(input.Email),
	)

	role := strings.ToUpper(
		strings.TrimSpace(input.Role),
	)

	if err := validateName(name); err != nil {
		return nil, err
	}

	if err := validateEmail(email); err != nil {
		return nil, err
	}

	if !isValidRole(role) {
		return nil, ErrInvalidRole
	}

	if err := validatePassword(
		input.Password,
	); err != nil {
		return nil, err
	}

	passwordHash, err :=
		bcrypt.GenerateFromPassword(
			[]byte(input.Password),
			bcrypt.DefaultCost,
		)
	if err != nil {
		return nil, err
	}

	return s.repository.CreateWithRole(
		ctx,
		name,
		email,
		string(passwordHash),
		role,
	)
}

func (s *Service) Update(
	ctx context.Context,
	actorID int64,
	targetID int64,
	input UpdateInput,
) (*User, error) {
	existingUser, err :=
		s.repository.FindByID(
			ctx,
			targetID,
		)
	if err != nil {
		return nil, err
	}

	name := existingUser.Name
	email := existingUser.Email
	role := existingUser.RoleCode

	if input.Name != nil {
		name = strings.TrimSpace(
			*input.Name,
		)

		if err := validateName(name); err != nil {
			return nil, err
		}
	}

	if input.Email != nil {
		email = strings.ToLower(
			strings.TrimSpace(
				*input.Email,
			),
		)

		if err := validateEmail(email); err != nil {
			return nil, err
		}
	}

	if input.Role != nil {
		newRole := strings.ToUpper(
			strings.TrimSpace(
				*input.Role,
			),
		)

		if !isValidRole(newRole) {
			return nil, ErrInvalidRole
		}

		if newRole != existingUser.RoleCode {
			if actorID == targetID {
				return nil, ErrCannotChangeOwnRole
			}

			if existingUser.RoleCode ==
				RoleSuperAdmin &&
				existingUser.Status ==
					StatusActive {

				total, err :=
					s.repository.
						CountActiveSuperAdmins(
							ctx,
						)
				if err != nil {
					return nil, err
				}

				if total <= 1 {
					return nil,
						ErrLastActiveSuperAdmin
				}
			}
		}

		role = newRole
	}

	var passwordHash *string

	if input.Password != nil &&
		*input.Password != "" {
		if err := validatePassword(
			*input.Password,
		); err != nil {
			return nil, err
		}

		hash, err :=
			bcrypt.GenerateFromPassword(
				[]byte(*input.Password),
				bcrypt.DefaultCost,
			)
		if err != nil {
			return nil, err
		}

		value := string(hash)
		passwordHash = &value
	}

	return s.repository.Update(
		ctx,
		targetID,
		name,
		email,
		role,
		passwordHash,
	)
}

func (s *Service) UpdateStatus(
	ctx context.Context,
	actorID int64,
	targetID int64,
	status string,
) (*User, error) {
	status = strings.ToUpper(
		strings.TrimSpace(status),
	)

	if !isValidStatus(status) {
		return nil, ErrInvalidStatus
	}

	existingUser, err :=
		s.repository.FindByID(
			ctx,
			targetID,
		)
	if err != nil {
		return nil, err
	}

	if actorID == targetID &&
		status == StatusInactive {
		return nil, ErrCannotDeactivateSelf
	}

	if existingUser.Status == status {
		return existingUser, nil
	}

	if existingUser.RoleCode ==
		RoleSuperAdmin &&
		existingUser.Status ==
			StatusActive &&
		status == StatusInactive {

		total, err :=
			s.repository.
				CountActiveSuperAdmins(
					ctx,
				)
		if err != nil {
			return nil, err
		}

		if total <= 1 {
			return nil,
				ErrLastActiveSuperAdmin
		}
	}

	return s.repository.UpdateStatus(
		ctx,
		targetID,
		status,
	)
}

func validateName(
	name string,
) error {
	length := utf8.RuneCountInString(
		strings.TrimSpace(name),
	)

	if length < 3 ||
		length > 120 {
		return ErrInvalidName
	}

	return nil
}

func validateEmail(
	email string,
) error {
	email = strings.TrimSpace(email)

	if len(email) == 0 ||
		len(email) > 255 ||
		!emailPattern.MatchString(email) {
		return ErrInvalidEmail
	}

	return nil
}

func validatePassword(
	password string,
) error {
	length := len(
		[]byte(password),
	)

	if length < 8 ||
		length > 72 {
		return ErrInvalidPassword
	}

	return nil
}

func isValidRole(
	role string,
) bool {
	switch role {
	case RoleSuperAdmin,
		RoleManager,
		RoleAgent,
		RoleCustomer:
		return true

	default:
		return false
	}
}

func isValidStatus(
	status string,
) bool {
	switch status {
	case StatusActive,
		StatusInactive:
		return true

	default:
		return false
	}
}
