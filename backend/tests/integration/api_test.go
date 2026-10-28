package integration

import (
	"context"
	"net/http"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

func baseURL(t *testing.T) string {
	t.Helper()
	value := strings.TrimRight(
		os.Getenv("GODESK_TEST_BASE_URL"),
		"/",
	)
	if value == "" {
		t.Skip("GODESK_TEST_BASE_URL belum dikonfigurasi")
	}
	parsed, err := url.Parse(value)
	if err != nil {
		t.Fatalf("URL tidak valid: %v", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		t.Fatal("URL harus menggunakan HTTP atau HTTPS")
	}
	switch parsed.Hostname() {
	case "localhost", "127.0.0.1", "::1":
	default:
		t.Fatal("Integration test hanya boleh menggunakan localhost")
	}
	return value
}
func get(t *testing.T, path string) *http.Response {
	t.Helper()
	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	t.Cleanup(cancel)
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		baseURL(t)+path,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(
			req *http.Request,
			via []*http.Request,
		) error {
			return http.ErrUseLastResponse
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("Request %s gagal: %v", path, err)
	}
	t.Cleanup(func() {
		_ = resp.Body.Close()
	})
	return resp
}
func TestHealth(t *testing.T) {
	resp := get(t, "/api/v1/health")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf(
			"Expected HTTP 200, got %d",
			resp.StatusCode,
		)
	}
}
func TestSecurityHeaders(t *testing.T) {
	resp := get(t, "/api/v1/health")
	expected := map[string]string{
		"X-Content-Type-Options":  "nosniff",
		"X-Frame-Options":         "DENY",
		"Referrer-Policy":         "no-referrer",
		"Cache-Control":           "no-store",
		"Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
	}
	for name, want := range expected {
		if got := resp.Header.Get(name); got != want {
			t.Errorf(
				"%s: expected %q, got %q",
				name,
				want,
				got,
			)
		}
	}
}
func TestAnonymousAccess(t *testing.T) {
	paths := []string{
		"/api/v1/auth/me",
		"/api/v1/dashboard",
		"/api/v1/tickets",
		"/api/v1/notifications",
		"/api/v1/sla/overview",
		"/api/v1/reports",
		"/api/v1/reports/options",
		"/api/v1/reports/export.csv",
		"/api/v1/admin/users",
	}
	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			resp := get(t, path)
			if resp.StatusCode != http.StatusUnauthorized {
				t.Errorf(
					"Expected HTTP 401, got %d",
					resp.StatusCode,
				)
			}
		})
	}
}
func TestInvalidRoute(t *testing.T) {
	resp := get(
		t,
		"/api/v1/stage11-invalid-route",
	)
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf(
			"Expected HTTP 404, got %d",
			resp.StatusCode,
		)
	}
}
