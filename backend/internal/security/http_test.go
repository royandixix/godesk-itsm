package security

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHeaders(t *testing.T) {
	handler := Headers(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	request := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	expected := map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
		"Referrer-Policy":        "no-referrer",
		"Cache-Control":          "no-store",
	}

	for header, want := range expected {
		if got := response.Header().Get(header); got != want {
			t.Errorf("%s: got %q, want %q", header, got, want)
		}
	}
}

func TestAuthRateLimit(t *testing.T) {
	limiter := NewAuthLimiter(2, time.Minute)

	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	for i, want := range []int{
		http.StatusNoContent,
		http.StatusNoContent,
		http.StatusTooManyRequests,
	} {
		request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
		request.RemoteAddr = "192.0.2.10:40000"

		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)

		if response.Code != want {
			t.Errorf("request %d: got %d, want %d", i+1, response.Code, want)
		}

		if i == 2 && response.Header().Get("Retry-After") == "" {
			t.Error("missing Retry-After")
		}
	}

	request := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Errorf("health: got %d", response.Code)
	}

	request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	request.RemoteAddr = "192.0.2.11:40000"

	response = httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Errorf("other IP: got %d", response.Code)
	}
}
