package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"`

	jwt.RegisteredClaims
}

type TokenManager struct {
	secret []byte
	issuer string
	ttl    time.Duration
}

func NewTokenManager(
	secret string,
	issuer string,
	ttl time.Duration,
) (*TokenManager, error) {
	if len(secret) < 32 {
		return nil, errors.New(
			"JWT_SECRET minimal 32 karakter",
		)
	}

	if ttl <= 0 {
		return nil, errors.New(
			"JWT TTL harus lebih dari 0",
		)
	}

	return &TokenManager{
		secret: []byte(secret),
		issuer: issuer,
		ttl:    ttl,
	}, nil
}

func (m *TokenManager) Generate(
	userID int64,
	role string,
) (string, error) {
	now := time.Now()

	claims := Claims{
		UserID: userID,
		Role:   role,

		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   fmt.Sprintf("%d", userID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
		},
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	return token.SignedString(m.secret)
}

func (m *TokenManager) Parse(
	tokenString string,
) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (any, error) {
			if token.Method.Alg() !=
				jwt.SigningMethodHS256.Alg() {
				return nil, errors.New(
					"algoritma token tidak valid",
				)
			}

			return m.secret, nil
		},
		jwt.WithIssuer(m.issuer),
		jwt.WithValidMethods(
			[]string{
				jwt.SigningMethodHS256.Alg(),
			},
		),
	)

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("token tidak valid")
	}

	return claims, nil
}

func (m *TokenManager) TTL() time.Duration {
	return m.ttl
}
