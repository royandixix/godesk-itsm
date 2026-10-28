package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/royandixix/godesk/backend/internal/config"
	"github.com/royandixix/godesk/backend/internal/user"
)

type Handler struct {
	service      *Service
	cookieName   string
	cookieSecure bool
	cookieMaxAge int
}

type registerRequest struct {
	Name string `json:"name" binding:"required,min=3,max=120"`

	Email string `json:"email" binding:"required,email,max=255"`

	Password string `json:"password" binding:"required,min=8,max=72"`
}

type loginRequest struct {
	Email string `json:"email" binding:"required,email,max=255"`

	Password string `json:"password" binding:"required,min=8,max=72"`
}

func NewHandler(
	service *Service,
	cfg config.Config,
) *Handler {
	return &Handler{
		service:      service,
		cookieName:   cfg.CookieName,
		cookieSecure: cfg.AppEnv == "production",
		cookieMaxAge: int(
			(time.Duration(cfg.JWTTTLHours) *
				time.Hour).Seconds(),
		),
	}
}

func (h *Handler) Register(c *gin.Context) {
	var request registerRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Data registrasi tidak valid",
			},
		)

		return
	}

	result, err := h.service.Register(
		c.Request.Context(),
		RegisterInput{
			Name:     request.Name,
			Email:    request.Email,
			Password: request.Password,
		},
	)
	if err != nil {
		switch {
		case errors.Is(err, user.ErrEmailExists):
			c.JSON(
				http.StatusConflict,
				gin.H{
					"message": "Email sudah digunakan",
				},
			)

		case errors.Is(
			err,
			ErrInvalidPasswordLength,
		):
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"message": err.Error(),
				},
			)

		default:
			c.JSON(
				http.StatusInternalServerError,
				gin.H{
					"message": "Gagal membuat akun",
				},
			)
		}

		return
	}

	h.setAuthCookie(
		c,
		result.Token,
	)

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "Registrasi berhasil",
			"data":    result.User,
		},
	)
}

func (h *Handler) Login(c *gin.Context) {
	var request loginRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Email dan password wajib diisi",
			},
		)

		return
	}

	result, err := h.service.Login(
		c.Request.Context(),
		LoginInput{
			Email:    request.Email,
			Password: request.Password,
		},
	)
	if err != nil {
		switch {
		case errors.Is(
			err,
			ErrInvalidCredentials,
		):
			c.JSON(
				http.StatusUnauthorized,
				gin.H{
					"message": err.Error(),
				},
			)

		case errors.Is(
			err,
			ErrAccountInactive,
		):
			c.JSON(
				http.StatusForbidden,
				gin.H{
					"message": err.Error(),
				},
			)

		default:
			c.JSON(
				http.StatusInternalServerError,
				gin.H{
					"message": "Gagal melakukan login",
				},
			)
		}

		return
	}

	h.setAuthCookie(
		c,
		result.Token,
	)

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Login berhasil",
			"data":    result.User,
		},
	)
}

func (h *Handler) Me(c *gin.Context) {
	currentUserValue, exists := c.Get(
		"current_user",
	)
	if !exists {
		c.JSON(
			http.StatusUnauthorized,
			gin.H{
				"message": "Silakan login terlebih dahulu",
			},
		)

		return
	}

	currentUser, ok := currentUserValue.(*user.User)
	if !ok {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Data sesi tidak valid",
			},
		)

		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "User berhasil dimuat",
			"data":    currentUser,
		},
	)
}

func (h *Handler) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)

	c.SetCookie(
		h.cookieName,
		"",
		-1,
		"/",
		"",
		h.cookieSecure,
		true,
	)

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Logout berhasil",
		},
	)
}

func (h *Handler) setAuthCookie(
	c *gin.Context,
	token string,
) {
	c.SetSameSite(http.SameSiteLaxMode)

	c.SetCookie(
		h.cookieName,
		token,
		h.cookieMaxAge,
		"/",
		"",
		h.cookieSecure,
		true,
	)
}
