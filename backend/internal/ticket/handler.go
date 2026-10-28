package ticket

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

func (h *Handler) Create(
	c *gin.Context,
) {
	actor, ok := actorFromContext(c)
	if !ok {
		return
	}

	var input CreateInput

	if err := c.ShouldBindJSON(
		&input,
	); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Format data ticket tidak valid",
			},
		)

		return
	}

	item, err := h.service.Create(
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
			"message": "Ticket berhasil dibuat",
			"data":    item,
		},
	)
}

func (h *Handler) List(
	c *gin.Context,
) {
	actor, ok := actorFromContext(c)
	if !ok {
		return
	}

	filter := ListFilter{
		Status:   c.Query("status"),
		Priority: c.Query("priority"),
		Search:   c.Query("search"),
	}

	categoryIDText := strings.TrimSpace(
		c.Query("category_id"),
	)

	if categoryIDText != "" {
		categoryID, err := strconv.ParseInt(
			categoryIDText,
			10,
			64,
		)

		if err != nil ||
			categoryID <= 0 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"message": "category_id tidak valid",
				},
			)

			return
		}

		filter.CategoryID =
			categoryID
	}

	limitText := strings.TrimSpace(
		c.Query("limit"),
	)

	if limitText != "" {
		limit, err := strconv.Atoi(
			limitText,
		)

		if err != nil ||
			limit <= 0 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"message": "limit tidak valid",
				},
			)

			return
		}

		filter.Limit =
			limit
	}

	offsetText := strings.TrimSpace(
		c.Query("offset"),
	)

	if offsetText != "" {
		offset, err := strconv.Atoi(
			offsetText,
		)

		if err != nil ||
			offset < 0 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"message": "offset tidak valid",
				},
			)

			return
		}

		filter.Offset =
			offset
	}

	result, err := h.service.List(
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
			"data": result,
		},
	)
}

func (h *Handler) GetByID(
	c *gin.Context,
) {
	actor, ok := actorFromContext(c)
	if !ok {
		return
	}

	id, ok := ticketIDFromParam(c)
	if !ok {
		return
	}

	item, err := h.service.GetByID(
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

func (h *Handler) Update(
	c *gin.Context,
) {
	actor, ok := actorFromContext(c)
	if !ok {
		return
	}

	id, ok := ticketIDFromParam(c)
	if !ok {
		return
	}

	var input UpdateInput

	if err := c.ShouldBindJSON(
		&input,
	); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Format data ticket tidak valid",
			},
		)

		return
	}

	item, err := h.service.Update(
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
			"message": "Ticket berhasil diperbarui",
			"data":    item,
		},
	)
}

func (h *Handler) UpdateStatus(
	c *gin.Context,
) {
	actor, ok := actorFromContext(c)
	if !ok {
		return
	}

	id, ok := ticketIDFromParam(c)
	if !ok {
		return
	}

	var input UpdateStatusInput

	if err := c.ShouldBindJSON(
		&input,
	); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Format status ticket tidak valid",
			},
		)

		return
	}

	item, err := h.service.UpdateStatus(
		c.Request.Context(),
		actor,
		id,
		input.Status,
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
			"message": "Status ticket berhasil diperbarui",
			"data":    item,
		},
	)
}

func (h *Handler) AssignAgent(
	c *gin.Context,
) {
	actor, ok := actorFromContext(c)
	if !ok {
		return
	}

	id, ok := ticketIDFromParam(c)
	if !ok {
		return
	}

	var input AssignInput

	if err := c.ShouldBindJSON(
		&input,
	); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Format assign agent tidak valid",
			},
		)

		return
	}

	item, err := h.service.AssignAgent(
		c.Request.Context(),
		actor,
		id,
		input.AgentID,
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
			"message": "Agent berhasil ditugaskan",
			"data":    item,
		},
	)
}

func (h *Handler) Delete(
	c *gin.Context,
) {
	actor, ok := actorFromContext(c)
	if !ok {
		return
	}

	id, ok := ticketIDFromParam(c)
	if !ok {
		return
	}

	err := h.service.Delete(
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
			"message": "Ticket berhasil dihapus",
		},
	)
}

func actorFromContext(
	c *gin.Context,
) (Actor, bool) {
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

		return Actor{}, false
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

			return Actor{}, false
		}

		return Actor{
			UserID: currentUser.ID,
			Role:   currentUser.RoleCode,
		}, true

	case user.User:
		return Actor{
			UserID: currentUser.ID,
			Role:   currentUser.RoleCode,
		}, true

	default:
		c.JSON(
			http.StatusUnauthorized,
			gin.H{
				"message": "Sesi pengguna tidak valid",
			},
		)

		return Actor{}, false
	}
}

// ActorFromContext mengekspor helper autentikasi ticket
// agar package lain seperti attachment dapat menggunakan
// actor yang sama tanpa menduplikasi logika current_user.
func ActorFromContext(
	c *gin.Context,
) (Actor, bool) {
	return actorFromContext(c)
}

func ticketIDFromParam(
	c *gin.Context,
) (int64, bool) {
	id, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil ||
		id <= 0 {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "ID ticket tidak valid",
			},
		)

		return 0, false
	}

	return id, true
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
				"message": "Ticket tidak ditemukan",
			},
		)

	case errors.Is(
		err,
		ErrCategoryNotFound,
	):
		c.JSON(
			http.StatusNotFound,
			gin.H{
				"message": "Kategori tidak ditemukan atau tidak aktif",
			},
		)

	case errors.Is(
		err,
		ErrAgentNotFound,
	):
		c.JSON(
			http.StatusNotFound,
			gin.H{
				"message": "Agent tidak ditemukan atau tidak aktif",
			},
		)

	default:
		log.Printf(
			"[TICKET ERROR] %v",
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

// WriteServiceError mengekspor error mapper ticket agar
// package lain dapat menghasilkan response HTTP yang konsisten.
func WriteServiceError(
	c *gin.Context,
	err error,
) {
	writeServiceError(
		c,
		err,
	)
}
