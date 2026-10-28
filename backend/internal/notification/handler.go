package notification

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
	userID, ok :=
		currentUserID(
			c,
		)

	if !ok {
		return
	}

	limit :=
		20

	offset :=
		0

	limitText :=
		strings.TrimSpace(
			c.Query(
				"limit",
			),
		)

	if limitText != "" {
		value, err :=
			strconv.Atoi(
				limitText,
			)

		if err != nil ||
			value <= 0 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"message": "limit tidak valid",
				},
			)

			return
		}

		limit =
			value
	}

	offsetText :=
		strings.TrimSpace(
			c.Query(
				"offset",
			),
		)

	if offsetText != "" {
		value, err :=
			strconv.Atoi(
				offsetText,
			)

		if err != nil ||
			value < 0 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"message": "offset tidak valid",
				},
			)

			return
		}

		offset =
			value
	}

	result, err :=
		h.service.List(
			c.Request.Context(),
			userID,
			limit,
			offset,
		)

	if err != nil {
		writeError(
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

func (h *Handler) UnreadCount(
	c *gin.Context,
) {
	userID, ok :=
		currentUserID(
			c,
		)

	if !ok {
		return
	}

	count, err :=
		h.service.UnreadCount(
			c.Request.Context(),
			userID,
		)

	if err != nil {
		writeError(
			c,
			err,
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"data": gin.H{
				"count": count,
			},
		},
	)
}

func (h *Handler) MarkRead(
	c *gin.Context,
) {
	userID, ok :=
		currentUserID(
			c,
		)

	if !ok {
		return
	}

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
				"message": "ID notifikasi tidak valid",
			},
		)

		return
	}

	err =
		h.service.MarkRead(
			c.Request.Context(),
			id,
			userID,
		)

	if err != nil {
		writeError(
			c,
			err,
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Notifikasi berhasil ditandai sebagai dibaca",
		},
	)
}

func (h *Handler) MarkAllRead(
	c *gin.Context,
) {
	userID, ok :=
		currentUserID(
			c,
		)

	if !ok {
		return
	}

	updated, err :=
		h.service.MarkAllRead(
			c.Request.Context(),
			userID,
		)

	if err != nil {
		writeError(
			c,
			err,
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Semua notifikasi berhasil ditandai sebagai dibaca",

			"data": gin.H{
				"updated": updated,
			},
		},
	)
}

func currentUserID(
	c *gin.Context,
) (int64, bool) {
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

		return 0,
			false
	}

	switch currentUser :=
		value.(type) {
	case *user.User:
		if currentUser == nil {
			break
		}

		return currentUser.ID,
			true

	case user.User:
		return currentUser.ID,
			true
	}

	c.JSON(
		http.StatusUnauthorized,
		gin.H{
			"message": "Sesi pengguna tidak valid",
		},
	)

	return 0,
		false
}

func writeError(
	c *gin.Context,
	err error,
) {
	switch {
	case errors.Is(
		err,
		ErrNotFound,
	):
		c.JSON(
			http.StatusNotFound,
			gin.H{
				"message": "Notifikasi tidak ditemukan",
			},
		)

	default:
		log.Printf(
			"[NOTIFICATION ERROR] %v",
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
