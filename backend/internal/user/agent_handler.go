package user

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AgentHandler struct {
	repository *Repository
}

func NewAgentHandler(
	repository *Repository,
) *AgentHandler {
	return &AgentHandler{
		repository: repository,
	}
}

func (h *AgentHandler) ListActive(
	c *gin.Context,
) {
	agents, err :=
		h.repository.ListActiveAgents(
			c.Request.Context(),
		)

	if err != nil {
		log.Printf(
			"[AGENT ERROR] %v",
			err,
		)

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Gagal mengambil daftar agent",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"data": agents,
		},
	)
}
