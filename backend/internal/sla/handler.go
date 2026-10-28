package sla

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/royandixix/godesk/backend/internal/ticket"
	"github.com/royandixix/godesk/backend/internal/user"
)

type Handler struct {
	repository *Repository
	tickets    *ticket.Service
}

func NewHandler(
	repository *Repository,
	tickets *ticket.Service,
) *Handler {
	return &Handler{
		repository: repository,
		tickets:    tickets,
	}
}

func actor(c *gin.Context) (ticket.Actor, bool) {
	value, exists := c.Get("current_user")
	currentUser, ok := value.(*user.User)

	if !exists || !ok || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Silakan login terlebih dahulu",
		})
		return ticket.Actor{}, false
	}

	return ticket.Actor{
		UserID: currentUser.ID,
		Role:   currentUser.RoleCode,
	}, true
}

// GET /api/v1/tickets/:id/sla
func (h *Handler) Ticket(c *gin.Context) {
	currentActor, ok := actor(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "ID tiket tidak valid",
		})
		return
	}

	// Gunakan aturan akses tiket yang sudah ada.
	_, err = h.tickets.GetByID(
		c.Request.Context(),
		currentActor,
		id,
	)

	if err != nil {
		switch {
		case errors.Is(err, ticket.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{
				"message": "Akses ditolak",
			})
		case errors.Is(err, ticket.ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"message": "Tiket tidak ditemukan",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Gagal memeriksa akses tiket",
			})
		}
		return
	}

	result, err := h.repository.GetTicket(
		c.Request.Context(),
		id,
	)

	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"message": "Data SLA tidak ditemukan",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengambil SLA tiket",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// GET /api/v1/sla/policies
func (h *Handler) Policies(c *gin.Context) {
	result, err := h.repository.ListPolicies(c.Request.Context())

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengambil kebijakan SLA",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// PATCH /api/v1/admin/sla/policies/:priority
func (h *Handler) UpdatePolicy(c *gin.Context) {
	var input struct {
		FirstResponseMinutes int `json:"first_response_minutes"`
		ResolutionMinutes    int `json:"resolution_minutes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil ||
		!validPolicyMinutes(
			input.FirstResponseMinutes,
			input.ResolutionMinutes,
		) {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Waktu SLA tidak valid. Penyelesaian harus lebih lama atau sama dengan waktu respons.",
		})
		return
	}

	priority := strings.ToUpper(
		strings.TrimSpace(c.Param("priority")),
	)

	switch priority {
	case "LOW", "MEDIUM", "HIGH", "URGENT":
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Prioritas tidak valid",
		})
		return
	}

	result, err := h.repository.UpdatePolicy(
		c.Request.Context(),
		priority,
		input.FirstResponseMinutes,
		input.ResolutionMinutes,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal menyimpan kebijakan SLA",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Kebijakan SLA berhasil diperbarui",
		"data":    result,
	})
}

// GET /api/v1/sla/overview
func (h *Handler) Overview(c *gin.Context) {
	result, err := h.repository.GetOverview(c.Request.Context())

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengambil ringkasan SLA",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// GET /api/v1/sla/tickets
func (h *Handler) Tickets(c *gin.Context) {
	filter := strings.ToUpper(
		strings.TrimSpace(c.DefaultQuery("status", "ALL")),
	)

	if !validStatusFilter(filter) {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Filter SLA tidak valid",
		})
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 || limit > 100 {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Limit harus antara 1 dan 100",
		})
		return
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 || offset > 1000000 {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Offset tidak valid",
		})
		return
	}

	result, err := h.repository.ListTickets(
		c.Request.Context(),
		filter,
		limit,
		offset,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengambil daftar tiket SLA",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
