package knowledge

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

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

func (h *Handler) List(
	c *gin.Context,
) {
	actor, ok :=
		actorFromContext(
			c,
		)
	if !ok {
		return
	}

	filter :=
		ListFilter{
			Search: strings.TrimSpace(
				c.Query(
					"search",
				),
			),
			Status: Status(
				strings.TrimSpace(
					c.Query(
						"status",
					),
				),
			),
		}

	categoryText :=
		strings.TrimSpace(
			c.Query(
				"category_id",
			),
		)

	if categoryText != "" {
		categoryID, err :=
			strconv.ParseInt(
				categoryText,
				10,
				64,
			)

		if err != nil ||
			categoryID <= 0 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"message": "ID kategori tidak valid",
				},
			)

			return
		}

		filter.CategoryID =
			&categoryID
	}

	items, err :=
		h.service.List(
			c.Request.Context(),
			actor,
			filter,
		)

	if err != nil {
		writeServiceError(
			c,
			err,
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

func (h *Handler) GetByID(
	c *gin.Context,
) {
	actor, ok :=
		actorFromContext(
			c,
		)
	if !ok {
		return
	}

	id, ok :=
		articleIDFromParam(
			c,
		)
	if !ok {
		return
	}

	item, err :=
		h.service.GetByID(
			c.Request.Context(),
			actor,
			id,
		)

	if err != nil {
		writeServiceError(
			c,
			err,
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"data": item,
		},
	)
}

func (h *Handler) Create(
	c *gin.Context,
) {
	actor, ok :=
		actorFromContext(
			c,
		)
	if !ok {
		return
	}

	var input CreateInput

	if err :=
		c.ShouldBindJSON(
			&input,
		); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Format data artikel tidak valid",
			},
		)

		return
	}

	item, err :=
		h.service.Create(
			c.Request.Context(),
			actor,
			input,
		)

	if err != nil {
		writeServiceError(
			c,
			err,
		)

		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "Artikel knowledge base berhasil dibuat",
			"data":    item,
		},
	)
}

func (h *Handler) Update(
	c *gin.Context,
) {
	actor, ok :=
		actorFromContext(
			c,
		)
	if !ok {
		return
	}

	id, ok :=
		articleIDFromParam(
			c,
		)
	if !ok {
		return
	}

	var input UpdateInput

	if err :=
		c.ShouldBindJSON(
			&input,
		); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Format data artikel tidak valid",
			},
		)

		return
	}

	item, err :=
		h.service.Update(
			c.Request.Context(),
			actor,
			id,
			input,
		)

	if err != nil {
		writeServiceError(
			c,
			err,
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Artikel knowledge base berhasil diperbarui",
			"data":    item,
		},
	)
}

func (h *Handler) Delete(
	c *gin.Context,
) {
	actor, ok :=
		actorFromContext(
			c,
		)
	if !ok {
		return
	}

	id, ok :=
		articleIDFromParam(
			c,
		)
	if !ok {
		return
	}

	err :=
		h.service.Delete(
			c.Request.Context(),
			actor,
			id,
		)

	if err != nil {
		writeServiceError(
			c,
			err,
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Artikel knowledge base berhasil dihapus",
		},
	)
}

func actorFromContext(
	c *gin.Context,
) (Actor, bool) {
	value, exists :=
		c.Get(
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

func articleIDFromParam(
	c *gin.Context,
) (int64, bool) {
	id, err :=
		strconv.ParseInt(
			c.Param(
				"id",
			),
			10,
			64,
		)

	if err != nil ||
		id <= 0 {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "ID artikel tidak valid",
			},
		)

		return 0,
			false
	}

	return id,
		true
}

func writeServiceError(
	c *gin.Context,
	err error,
) {
	switch {
	case errors.Is(
		err,
		ErrForbidden,
	):
		c.JSON(
			http.StatusForbidden,
			gin.H{
				"message": err.Error(),
			},
		)

	case errors.Is(
		err,
		ErrInvalidInput,
	):
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Judul minimal 5 karakter, isi minimal 10 karakter, dan status harus DRAFT atau PUBLISHED",
			},
		)

	case errors.Is(
		err,
		ErrCategoryNotFound,
	):
		c.JSON(
			http.StatusNotFound,
			gin.H{
				"message": err.Error(),
			},
		)

	case errors.Is(
		err,
		ErrNotFound,
	):
		c.JSON(
			http.StatusNotFound,
			gin.H{
				"message": err.Error(),
			},
		)

	default:
		log.Printf(
			"knowledge service error: %v",
			err,
		)

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Terjadi kesalahan pada server",
			},
		)
	}
}
