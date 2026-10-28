package dashboard

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/royandixix/godesk/backend/internal/user"
)

type Handler struct {
	service *Service
}

func NewHandler(
	service *Service,
) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) Get(
	c *gin.Context,
) {
	actor, ok := actorFromContext(
		c,
	)

	if !ok {
		return
	}

	data, err := h.service.Get(
		c.Request.Context(),
		actor,
	)

	if err != nil {
		log.Printf(
			"[DASHBOARD ERROR] %v",
			err,
		)

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Gagal mengambil data dashboard",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"data": data,
		},
	)
}

func actorFromContext(
	c *gin.Context,
) (
	Actor,
	bool,
) {
	value, exists := c.Get(
		"current_user",
	)

	if !exists {
		c.JSON(
			http.StatusUnauthorized,
			gin.H{
				"message": "Sesi pengguna tidak ditemukan",
			},
		)

		return Actor{},
			false
	}

	switch currentUser :=
		value.(type) {
	case *user.User:
		if currentUser == nil {
			c.JSON(
				http.StatusUnauthorized,
				gin.H{
					"message": "Sesi pengguna tidak valid",
				},
			)

			return Actor{},
				false
		}

		return Actor{
				UserID: currentUser.ID,
				Role:   currentUser.RoleCode,
			},
			true

	case user.User:
		return Actor{
				UserID: currentUser.ID,
				Role:   currentUser.RoleCode,
			},
			true

	default:
		c.JSON(
			http.StatusUnauthorized,
			gin.H{
				"message": "Sesi pengguna tidak valid",
			},
		)

		return Actor{},
			false
	}
}
