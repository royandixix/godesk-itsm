package security

import (
	"encoding/json"
	"math"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

func Headers(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")

		if strings.HasPrefix(r.URL.Path, "/api/v1/") {
			h.Set("Cache-Control", "no-store")
		}

		next.ServeHTTP(w, r)
	})
}

type attempt struct {
	count     int
	expiresAt time.Time
}

type AuthLimiter struct {
	mu          sync.Mutex
	attempts    map[string]attempt
	maxRequests int
	window      time.Duration
	nextCleanup time.Time
}

func NewAuthLimiter(maxRequests int, window time.Duration) *AuthLimiter {
	if maxRequests < 1 {
		maxRequests = 10
	}
	if window <= 0 {
		window = 5 * time.Minute
	}

	return &AuthLimiter{
		attempts:    make(map[string]attempt),
		maxRequests: maxRequests,
		window:      window,
	}
}

func (l *AuthLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost ||
			(r.URL.Path != "/api/v1/auth/login" &&
				r.URL.Path != "/api/v1/auth/register") {
			next.ServeHTTP(w, r)
			return
		}

		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}

		key := r.URL.Path + "|" + ip
		now := time.Now()

		l.mu.Lock()

		if !now.Before(l.nextCleanup) {
			for key, value := range l.attempts {
				if !now.Before(value.expiresAt) {
					delete(l.attempts, key)
				}
			}
			l.nextCleanup = now.Add(l.window)
		}

		entry, exists := l.attempts[key]
		if !exists || !now.Before(entry.expiresAt) {
			entry = attempt{
				expiresAt: now.Add(l.window),
			}
		}

		entry.count++
		l.attempts[key] = entry

		blocked := entry.count > l.maxRequests
		remaining := entry.expiresAt.Sub(now)

		l.mu.Unlock()

		if blocked {
			wait := int(math.Ceil(remaining.Seconds()))
			if wait < 1 {
				wait = 1
			}

			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.Header().Set("Retry-After", strconv.Itoa(wait))
			w.Header().Set("Cache-Control", "no-store")
			w.WriteHeader(http.StatusTooManyRequests)

			_ = json.NewEncoder(w).Encode(map[string]string{
				"message": "Terlalu banyak percobaan. Silakan coba lagi nanti.",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}
