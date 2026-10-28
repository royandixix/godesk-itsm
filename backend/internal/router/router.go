package router

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/royandixix/godesk/backend/internal/activity"
	"github.com/royandixix/godesk/backend/internal/attachment"
	"github.com/royandixix/godesk/backend/internal/auth"
	"github.com/royandixix/godesk/backend/internal/category"
	"github.com/royandixix/godesk/backend/internal/config"
	"github.com/royandixix/godesk/backend/internal/dashboard"
	"github.com/royandixix/godesk/backend/internal/middleware"
	"github.com/royandixix/godesk/backend/internal/notification"
	"github.com/royandixix/godesk/backend/internal/reports"
	"github.com/royandixix/godesk/backend/internal/sla"
	"github.com/royandixix/godesk/backend/internal/ticket"
	"github.com/royandixix/godesk/backend/internal/user"
)

func New(db *pgxpool.Pool, cfg config.Config) (*gin.Engine, error) {
	tokenManager, err := auth.NewTokenManager(
		cfg.JWTSecret,
		cfg.JWTIssuer,
		time.Duration(cfg.JWTTTLHours)*time.Hour,
	)
	if err != nil {
		return nil, fmt.Errorf("gagal membuat token manager: %w", err)
	}

	userRepository := user.NewRepository(db)
	categoryRepository := category.NewRepository(db)
	ticketRepository := ticket.NewRepository(db)
	attachmentRepository := attachment.NewRepository(db)
	dashboardRepository := dashboard.NewRepository(db)
	activityRepository := activity.NewRepository(db)
	notificationRepository := notification.NewRepository(db)
	slaRepository := sla.NewRepository(db)
	reportRepository := reports.NewRepository(db)

	notificationService := notification.NewService(notificationRepository)
	activityService := activity.NewService(activityRepository, notificationService)
	authService := auth.NewService(userRepository, tokenManager)
	userService := user.NewService(userRepository)
	ticketService := ticket.NewService(
		ticketRepository,
		categoryRepository,
		activityService,
		notificationService,
	)
	attachmentService := attachment.NewService(
		attachmentRepository,
		ticketService,
		cfg.AttachmentStoragePath,
		int64(cfg.AttachmentMaxSizeMB)*1024*1024,
	)
	dashboardService := dashboard.NewService(dashboardRepository)

	authHandler := auth.NewHandler(authService, cfg)
	categoryHandler := category.NewHandler(categoryRepository)
	ticketHandler := ticket.NewHandler(ticketService)
	attachmentHandler := attachment.NewHandler(attachmentService)
	dashboardHandler := dashboard.NewHandler(dashboardService)
	agentHandler := user.NewAgentHandler(userRepository)
	userHandler := user.NewHandler(userService)
	activityHandler := activity.NewHandler(activityService)
	notificationHandler := notification.NewHandler(notificationService)
	slaHandler := sla.NewHandler(slaRepository, ticketService)
	reportHandler := reports.NewHandler(reportRepository)

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{cfg.FrontendURL},
		AllowMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service": "godesk-api",
			"message": "GoDesk API is running",
		})
	})

	api := router.Group("/api/v1")

	api.GET("/health", func(c *gin.Context) {
		if err := db.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"service":  "godesk-api",
				"status":   "error",
				"database": "disconnected",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"service":  "godesk-api",
			"status":   "ok",
			"database": "connected",
		})
	})

	authRoutes := api.Group("/auth")
	authRoutes.POST("/register", authHandler.Register)
	authRoutes.POST("/login", authHandler.Login)
	authRoutes.POST("/logout", authHandler.Logout)
	authRoutes.GET(
		"/me",
		middleware.Auth(tokenManager, userRepository, cfg.CookieName),
		authHandler.Me,
	)

	protectedRoutes := api.Group("")
	protectedRoutes.Use(
		middleware.Auth(tokenManager, userRepository, cfg.CookieName),
	)

	protectedRoutes.GET("/categories", categoryHandler.ListActive)
	protectedRoutes.GET("/dashboard", dashboardHandler.Get)
	protectedRoutes.GET(
		"/agents",
		middleware.RequireRoles(user.RoleSuperAdmin, user.RoleManager),
		agentHandler.ListActive,
	)

	notificationRoutes := protectedRoutes.Group("/notifications")
	notificationRoutes.GET("", notificationHandler.List)
	notificationRoutes.GET("/unread-count", notificationHandler.UnreadCount)
	notificationRoutes.PATCH("/read-all", notificationHandler.MarkAllRead)
	notificationRoutes.PATCH("/:id/read", notificationHandler.MarkRead)

	ticketRoutes := protectedRoutes.Group("/tickets")
	ticketRoutes.POST("", ticketHandler.Create)
	ticketRoutes.GET("", ticketHandler.List)
	ticketRoutes.GET("/:id", ticketHandler.GetByID)
	ticketRoutes.PATCH("/:id", ticketHandler.Update)
	ticketRoutes.PATCH("/:id/status", ticketHandler.UpdateStatus)
	ticketRoutes.PATCH("/:id/assign", ticketHandler.AssignAgent)
	ticketRoutes.DELETE("/:id", ticketHandler.Delete)
	ticketRoutes.GET("/:id/sla", slaHandler.Ticket)
	ticketRoutes.GET("/:id/activity", activityHandler.ListTimeline)
	ticketRoutes.POST("/:id/comments", activityHandler.CreateComment)
	ticketRoutes.GET("/:id/attachments", attachmentHandler.List)
	ticketRoutes.POST("/:id/attachments", attachmentHandler.Upload)

	protectedRoutes.GET(
		"/attachments/:id/download",
		attachmentHandler.Download,
	)
	protectedRoutes.DELETE(
		"/attachments/:id",
		attachmentHandler.Delete,
	)

	slaRoutes := protectedRoutes.Group("/sla")
	slaRoutes.Use(
		middleware.RequireRoles(user.RoleSuperAdmin, user.RoleManager),
	)
	slaRoutes.GET("/overview", slaHandler.Overview)
	slaRoutes.GET("/tickets", slaHandler.Tickets)
	slaRoutes.GET("/policies", slaHandler.Policies)

	reportRoutes := protectedRoutes.Group("/reports")
	reportRoutes.Use(
		middleware.RequireRoles(user.RoleSuperAdmin, user.RoleManager),
	)
	reportRoutes.GET("", reportHandler.Dashboard)
	reportRoutes.GET("/options", reportHandler.Options)
	reportRoutes.GET("/export.csv", reportHandler.ExportCSV)

	adminRoutes := api.Group("/admin")
	adminRoutes.Use(
		middleware.Auth(tokenManager, userRepository, cfg.CookieName),
	)
	adminRoutes.Use(
		middleware.RequireRoles(user.RoleSuperAdmin),
	)

	adminRoutes.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Super Admin access granted",
		})
	})

	adminRoutes.GET("/users", userHandler.List)
	adminRoutes.GET("/users/:id", userHandler.GetByID)
	adminRoutes.POST("/users", userHandler.Create)
	adminRoutes.PATCH("/users/:id", userHandler.Update)
	adminRoutes.PATCH("/users/:id/status", userHandler.UpdateStatus)
	adminRoutes.PATCH("/sla/policies/:priority", slaHandler.UpdatePolicy)

	return router, nil
}
