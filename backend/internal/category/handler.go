package category

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	repository *Repository
}

func NewHandler(
	repository *Repository,
) *Handler {
	return &Handler{
		repository: repository,
	}
}

func (h *Handler) ListActive(
	c *gin.Context,
) {
	items, err := h.repository.ListActive(
		c.Request.Context(),
	)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Gagal mengambil kategori",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"data": items,
		},
	)
}
