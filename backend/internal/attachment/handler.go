package attachment

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/royandixix/godesk/backend/internal/ticket"
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
		ticket.ActorFromContext(
			c,
		)
	if !ok {
		return
	}

	ticketID, ok :=
		parsePositiveID(
			c,
			"id",
		)
	if !ok {
		return
	}

	items, err :=
		h.service.List(
			c.Request.Context(),
			actor,
			ticketID,
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

func (h *Handler) Upload(
	c *gin.Context,
) {
	actor, ok :=
		ticket.ActorFromContext(
			c,
		)
	if !ok {
		return
	}

	ticketID, ok :=
		parsePositiveID(
			c,
			"id",
		)
	if !ok {
		return
	}

	c.Request.Body =
		http.MaxBytesReader(
			c.Writer,
			c.Request.Body,
			h.service.MaxUploadBytes()+
				1024*1024,
		)

	fileHeader, err :=
		c.FormFile(
			"file",
		)
	if err != nil {
		var maxBytesError *http.MaxBytesError

		if errors.As(
			err,
			&maxBytesError,
		) {
			writeServiceError(
				c,
				ErrFileTooLarge,
			)

			return
		}

		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "File lampiran wajib dipilih",
			},
		)

		return
	}

	item, err :=
		h.service.Upload(
			c.Request.Context(),
			actor,
			ticketID,
			fileHeader,
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
			"message": "Lampiran berhasil diunggah",

			"data": item,
		},
	)
}

func (h *Handler) Download(
	c *gin.Context,
) {
	actor, ok :=
		ticket.ActorFromContext(
			c,
		)
	if !ok {
		return
	}

	id, ok :=
		parsePositiveID(
			c,
			"id",
		)
	if !ok {
		return
	}

	item, path, err :=
		h.service.GetDownload(
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

	c.Header(
		"Content-Type",
		item.MimeType,
	)

	c.Header(
		"X-Content-Type-Options",
		"nosniff",
	)

	c.Header(
		"Cache-Control",
		"private, no-store",
	)

	c.FileAttachment(
		path,
		item.OriginalName,
	)
}

func (h *Handler) Delete(
	c *gin.Context,
) {
	actor, ok :=
		ticket.ActorFromContext(
			c,
		)
	if !ok {
		return
	}

	id, ok :=
		parsePositiveID(
			c,
			"id",
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
			"message": "Lampiran berhasil dihapus",
		},
	)
}

func parsePositiveID(
	c *gin.Context,
	param string,
) (
	int64,
	bool,
) {
	value :=
		strings.TrimSpace(
			c.Param(
				param,
			),
		)

	id, err :=
		strconv.ParseInt(
			value,
			10,
			64,
		)

	if err != nil ||
		id <= 0 {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "ID tidak valid",
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
		ErrInvalidInput,
	),
		errors.Is(
			err,
			ErrFileRequired,
		):
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": err.Error(),
			},
		)

	case errors.Is(
		err,
		ErrFileTooLarge,
	):
		c.JSON(
			http.StatusRequestEntityTooLarge,
			gin.H{
				"message": err.Error(),
			},
		)

	case errors.Is(
		err,
		ErrFileTypeNotAllowed,
	):
		c.JSON(
			http.StatusUnsupportedMediaType,
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
		ErrStorage,
	):
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Gagal memproses file lampiran",
			},
		)

	default:
		ticket.WriteServiceError(
			c,
			err,
		)
	}
}
