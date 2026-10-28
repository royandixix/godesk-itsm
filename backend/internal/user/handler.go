package user

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

type createRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type updateStatusRequest struct {
	Status string `json:"status"`
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
	limit := 20
	offset := 0

	if value := strings.TrimSpace(
		c.Query("limit"),
	); value != "" {
		parsed, err := strconv.Atoi(value)

		if err != nil ||
			parsed <= 0 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"message": "limit tidak valid",
				},
			)
			return
		}

		limit = parsed
	}

	if value := strings.TrimSpace(
		c.Query("offset"),
	); value != "" {
		parsed, err := strconv.Atoi(value)

		if err != nil ||
			parsed < 0 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"message": "offset tidak valid",
				},
			)
			return
		}

		offset = parsed
	}

	result, err := h.service.List(
		c.Request.Context(),
		ListFilter{
			Role:   c.Query("role"),
			Status: c.Query("status"),
			Search: c.Query("search"),
			Limit:  limit,
			Offset: offset,
		},
	)
	if err != nil {
		writeUserError(c, err)
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
	id, ok := userIDFromParam(c)
	if !ok {
		return
	}

	item, err := h.service.GetByID(
		c.Request.Context(),
		id,
	)
	if err != nil {
		writeUserError(c, err)
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
	var request createRequest

	if err := c.ShouldBindJSON(
		&request,
	); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Format data user tidak valid",
			},
		)
		return
	}

	item, err := h.service.Create(
		c.Request.Context(),
		CreateInput{
			Name:     request.Name,
			Email:    request.Email,
			Password: request.Password,
			Role:     request.Role,
		},
	)
	if err != nil {
		writeUserError(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "User berhasil dibuat",
			"data":    item,
		},
	)
}

func (h *Handler) Update(
	c *gin.Context,
) {
	actor, ok := currentUserFromContext(c)
	if !ok {
		return
	}

	id, ok := userIDFromParam(c)
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
				"message": "Format data user tidak valid",
			},
		)
		return
	}

	item, err := h.service.Update(
		c.Request.Context(),
		actor.ID,
		id,
		input,
	)
	if err != nil {
		writeUserError(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "User berhasil diperbarui",
			"data":    item,
		},
	)
}

func (h *Handler) UpdateStatus(
	c *gin.Context,
) {
	actor, ok := currentUserFromContext(c)
	if !ok {
		return
	}

	id, ok := userIDFromParam(c)
	if !ok {
		return
	}

	var request updateStatusRequest

	if err := c.ShouldBindJSON(
		&request,
	); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Format status tidak valid",
			},
		)
		return
	}

	item, err := h.service.UpdateStatus(
		c.Request.Context(),
		actor.ID,
		id,
		request.Status,
	)
	if err != nil {
		writeUserError(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Status user berhasil diperbarui",
			"data":    item,
		},
	)
}

func currentUserFromContext(
	c *gin.Context,
) (*User, bool) {
	value, exists := c.Get(
		"current_user",
	)

	if !exists {
		c.JSON(
			http.StatusUnauthorized,
			gin.H{
				"message": "Silakan login terlebih dahulu",
			},
		)
		return nil, false
	}

	currentUser, ok := value.(*User)

	if !ok ||
		currentUser == nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Data sesi tidak valid",
			},
		)
		return nil, false
	}

	return currentUser, true
}

func userIDFromParam(
	c *gin.Context,
) (int64, bool) {
	id, err := strconv.ParseInt(
		strings.TrimSpace(
			c.Param("id"),
		),
		10,
		64,
	)

	if err != nil ||
		id <= 0 {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "ID user tidak valid",
			},
		)
		return 0, false
	}

	return id, true
}

func writeUserError(
	c *gin.Context,
	err error,
) {
	switch {
	case errors.Is(
		err,
		ErrUserNotFound,
	):
		c.JSON(
			http.StatusNotFound,
			gin.H{
				"message": "User tidak ditemukan",
			},
		)

	case errors.Is(
		err,
		ErrEmailExists,
	):
		c.JSON(
			http.StatusConflict,
			gin.H{
				"message": "Email sudah digunakan",
			},
		)

	case errors.Is(
		err,
		ErrInvalidName,
	),
		errors.Is(
			err,
			ErrInvalidEmail,
		),
		errors.Is(
			err,
			ErrInvalidRole,
		),
		errors.Is(
			err,
			ErrInvalidStatus,
		),
		errors.Is(
			err,
			ErrInvalidPassword,
		):
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": err.Error(),
			},
		)

	case errors.Is(
		err,
		ErrCannotChangeOwnRole,
	),
		errors.Is(
			err,
			ErrCannotDeactivateSelf,
		),
		errors.Is(
			err,
			ErrLastActiveSuperAdmin,
		):
		c.JSON(
			http.StatusForbidden,
			gin.H{
				"message": err.Error(),
			},
		)

	default:
		log.Printf(
			"[USER ERROR] %v",
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
