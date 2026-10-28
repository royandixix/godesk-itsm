package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RequireRoles(
	allowedRoles ...string,
) gin.HandlerFunc {
	allowed := make(
		map[string]struct{},
		len(allowedRoles),
	)

	for _, role := range allowedRoles {
		allowed[role] = struct{}{}
	}

	return func(c *gin.Context) {
		roleValue, exists := c.Get(
			"current_role",
		)
		if !exists {
			c.AbortWithStatusJSON(
				http.StatusUnauthorized,
				gin.H{
					"message": "Sesi tidak ditemukan",
				},
			)

			return
		}

		role, ok := roleValue.(string)
		if !ok {
			c.AbortWithStatusJSON(
				http.StatusForbidden,
				gin.H{
					"message": "Role tidak valid",
				},
			)

			return
		}

		if _, ok := allowed[role]; !ok {
			c.AbortWithStatusJSON(
				http.StatusForbidden,
				gin.H{
					"message": "Anda tidak memiliki akses",
				},
			)

			return
		}

		c.Next()
	}
}
