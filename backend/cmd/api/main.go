package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/royandixix/godesk/backend/internal/config"
	"github.com/royandixix/godesk/backend/internal/database"
	"github.com/royandixix/godesk/backend/internal/router"
	"github.com/royandixix/godesk/backend/internal/security"
	"github.com/royandixix/godesk/backend/internal/sla"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Info: file .env tidak ditemukan, menggunakan environment system")
	}

	cfg := config.Load()

	db, err := database.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Database error: %v", err)
	}
	defer db.Close()

	appRouter, err := router.New(db, cfg)
	if err != nil {
		log.Fatalf("Router error: %v", err)
	}

	authLimiter := security.NewAuthLimiter(
		10,
		5*time.Minute,
	)

	handler := security.Headers(
		authLimiter.Middleware(appRouter),
	)

	server := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	shutdownSignal, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	serverError := make(chan error, 1)

	go func() {
		log.Printf(
			"%s API starting on http://localhost:%s",
			cfg.AppName,
			cfg.AppPort,
		)

		if err := server.ListenAndServe(); err != nil &&
			!errors.Is(err, http.ErrServerClosed) {
			serverError <- err
		}
	}()

	go sla.Monitor(shutdownSignal, db)

	select {
	case <-shutdownSignal.Done():
		log.Println("Shutdown signal received")

	case err := <-serverError:
		log.Printf("HTTP server error: %v", err)
	}

	stop()

	shutdownContext, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	if err := server.Shutdown(shutdownContext); err != nil {
		log.Printf("Graceful shutdown error: %v", err)
	}

	log.Println("GoDesk API stopped")
}
