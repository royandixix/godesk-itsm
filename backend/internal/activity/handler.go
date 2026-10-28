package activity

import (
	"errors"
	"log"
	"net/http"
	"strconv"

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

func (h *Handler) ListTimeline(
	c *gin.Context,
) {
	ticketID, ok :=
		ticketIDFromParam(
			c,
		)

	if !ok {
		return
	}

	actor, ok :=
		actorFromContext(
			c,
		)

	if !ok {
		return
	}

	items, err :=
		h.service.ListTimeline(
			c.Request.Context(),
			ticketID,
			actor,
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

func (h *Handler) CreateComment(
	c *gin.Context,
) {
	ticketID, ok :=
		ticketIDFromParam(
			c,
		)

	if !ok {
		return
	}

	actor, ok :=
		actorFromContext(
			c,
		)

	if !ok {
		return
	}

	var input CreateCommentInput

	if err :=
		c.ShouldBindJSON(
			&input,
		); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Payload komentar tidak valid",
			},
		)

		return
	}

	result, err :=
		h.service.CreateComment(
			c.Request.Context(),
			ticketID,
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
			"message": "Komentar berhasil dikirim",
			"data":    result,
		},
	)
}

func ticketIDFromParam(
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
				"message": "ID tiket tidak valid",
			},
		)

		return 0, false
	}

	return id, true
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
				"message": "Silakan login terlebih dahulu",
			},
		)

		return Actor{}, false
	}

	switch currentUser :=
		value.(type) {

	case *user.User:
		if currentUser == nil {
			break
		}

		return Actor{
			UserID: currentUser.ID,

			Role: currentUser.RoleCode,
		}, true

	case user.User:
		return Actor{
			UserID: currentUser.ID,

			Role: currentUser.RoleCode,
		}, true
	}

	c.JSON(
		http.StatusUnauthorized,
		gin.H{
			"message": "Sesi pengguna tidak valid",
		},
	)

	return Actor{}, false
}

func writeServiceError(
	c *gin.Context,
	err error,
) {
	switch {
	case errors.Is(
		err,
		ErrTicketNotFound,
	):
		c.JSON(
			http.StatusNotFound,
			gin.H{
				"message": "Tiket tidak ditemukan",
			},
		)

	case errors.Is(
		err,
		ErrForbidden,
	):
		c.JSON(
			http.StatusForbidden,
			gin.H{
				"message": "Anda tidak memiliki akses ke tiket ini",
			},
		)

	case errors.Is(
		err,
		ErrInvalidComment,
	):
		c.JSON(
			http.StatusUnprocessableEntity,
			gin.H{
				"message": "Komentar wajib diisi maksimal 5000 karakter",
			},
		)

	default:
		log.Printf(
			"[ACTIVITY ERROR] %v",
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
