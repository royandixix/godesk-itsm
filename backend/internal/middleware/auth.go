package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/royandixix/godesk/backend/internal/auth"
	"github.com/royandixix/godesk/backend/internal/user"
)

func Auth(
	tokens *auth.TokenManager,
	users *user.Repository,
	cookieName string,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := ""

		cookieToken, err := c.Cookie(cookieName)
		if err == nil {
			tokenString = strings.TrimSpace(
				cookieToken,
			)
		}

		if tokenString == "" {
			authorization := strings.TrimSpace(
				c.GetHeader("Authorization"),
			)

			if len(authorization) > 7 &&
				strings.EqualFold(
					authorization[:7],
					"Bearer ",
				) {
				tokenString = strings.TrimSpace(
					authorization[7:],
				)
			}
		}

		if tokenString == "" {
			c.AbortWithStatusJSON(
				http.StatusUnauthorized,
				gin.H{
					"message": "Silakan login terlebih dahulu",
				},
			)

			return
		}

		claims, err := tokens.Parse(
			tokenString,
		)
		if err != nil {
			c.AbortWithStatusJSON(
				http.StatusUnauthorized,
				gin.H{
					"message": "Sesi tidak valid atau telah berakhir",
				},
			)

			return
		}

		currentUser, err := users.FindByID(
			c.Request.Context(),
			claims.UserID,
		)
		if err != nil {
			if errors.Is(
				err,
				user.ErrUserNotFound,
			) {
				c.AbortWithStatusJSON(
					http.StatusUnauthorized,
					gin.H{
						"message": "User tidak ditemukan",
					},
				)

				return
			}

			c.AbortWithStatusJSON(
				http.StatusInternalServerError,
				gin.H{
					"message": "Gagal memvalidasi sesi",
				},
			)

			return
		}

		if currentUser.Status != user.StatusActive {
			c.AbortWithStatusJSON(
				http.StatusForbidden,
				gin.H{
					"message": "Akun tidak aktif",
				},
			)

			return
		}

		c.Set(
			"current_user",
			currentUser,
		)

		c.Set(
			"current_role",
			currentUser.RoleCode,
		)

		c.Next()
	}
}
