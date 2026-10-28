
package integration

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

func testBaseURL(t *testing.T) string {
	t.Helper()

	base := strings.TrimRight(
		os.Getenv("GODESK_TEST_BASE_URL"),
		"/",
	)

	if base == "" {
		t.Skip("Set GODESK_TEST_BASE_URL untuk menjalankan smoke test API")
	}

	parsed, err := url.Parse(base)
	if err != nil ||
		(parsed.Scheme != "http" && parsed.Scheme != "https") {
		t.Fatal("GODESK_TEST_BASE_URL tidak valid")
	}

	switch parsed.Hostname() {
	case "localhost", "127.0.0.1", "::1":
	default:
		t.Fatal("Smoke test dibatasi ke server lokal")
	}

	return base
}

func request(t *testing.T, path string, cookie string) *http.Response {
	t.Helper()

	ctx, cancel := context.WithTimeout(
		context.Background(),
		8*time.Second,
	)
	t.Cleanup(cancel)

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		testBaseURL(t)+path,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}

	if cookie != "" {
		req.Header.Set("Cookie", cookie)
	}

	client := &http.Client{
		Timeout: 8 * time.Second,
		CheckRedirect: func(
			req *http.Request,
			via []*http.Request,
		) error {
			return http.ErrUseLastResponse
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("GET %s: %v", path, err)
	}

	t.Cleanup(func() {
		_ = resp.Body.Close()
	})

	return resp
}

func TestHealth(t *testing.T) {
	resp := request(t, "/api/v1/health", "")

	if resp.StatusCode != http.StatusOK {
		t.Fatalf(
			"health: expected 200, got %d",
			resp.StatusCode,
		)
	}
}

func TestSecurityHeaders(t *testing.T) {
	resp := request(t, "/api/v1/health", "")

	expected := map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":       "DENY",
		"Referrer-Policy":       "no-referrer",
		"Cache-Control":         "no-store",
	}

	for name, want := range expected {
		if got := resp.Header.Get(name); got != want {
			t.Errorf(
				"header %s got %q want %q",
				name,
				got,
				want,
			)
		}
	}
}

func TestAnonymousAccess(t *testing.T) {
	paths := []string{
		"/api/v1/auth/me",
		"/api/v1/tickets",
		"/api/v1/notifications",
		"/api/v1/sla/overview",
		"/api/v1/reports",
		"/api/v1/reports/options",
		"/api/v1/admin/users",
	}

	for _, path := range paths {
		t.Run(
			strings.ReplaceAll(path, "/", "_"),
			func(t *testing.T) {
				resp := request(t, path, "")

				if resp.StatusCode != http.StatusUnauthorized {
					t.Errorf(
						"GET %s: expected 401, got %d",
						path,
						resp.StatusCode,
					)
				}
			},
		)
	}
}

func TestUnknownRoute(t *testing.T) {
	resp := request(
		t,
		"/api/v1/route-that-does-not-exist",
		"",
	)

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf(
			"unknown route: expected 404 got %d",
			resp.StatusCode,
		)
	}
}

func TestReportsSuperAdmin(t *testing.T) {
	cookie := os.Getenv("GODESK_TEST_ADMIN_COOKIE")

	if cookie == "" {
		t.Skip("Opsional: set GODESK_TEST_ADMIN_COOKIE secara lokal")
	}

	now := time.Now().
		In(time.FixedZone("WITA", 8*60*60)).
		Format("2006-01-02")

	paths := []string{
		"/api/v1/reports/options",
		fmt.Sprintf(
			"/api/v1/reports?from=%s&to=%s&limit=5&offset=0",
			now,
			now,
		),
		"/api/v1/sla/overview",
	}

	for _, path := range paths {
		t.Run(
			strings.Split(path, "?")[0],
			func(t *testing.T) {
				resp := request(t, path, cookie)

				if resp.StatusCode != http.StatusOK {
					body, _ := io.ReadAll(
						io.LimitReader(resp.Body, 512),
					)

					t.Errorf(
						"GET %s: status %d, body %s",
						path,
						resp.StatusCode,
						strings.TrimSpace(string(body)),
					)
				}
			},
		)
	}
}

func TestAgentRestricted(t *testing.T) {
	cookie := os.Getenv("GODESK_TEST_AGENT_COOKIE")

	if cookie == "" {
		t.Skip("Opsional: set GODESK_TEST_AGENT_COOKIE secara lokal")
	}

	paths := []string{
		"/api/v1/reports",
		"/api/v1/reports/options",
		"/api/v1/sla/overview",
		"/api/v1/admin/users",
	}

	for _, path := range paths {
		t.Run(
			strings.ReplaceAll(path, "/", "_"),
			func(t *testing.T) {
				resp := request(t, path, cookie)

				if resp.StatusCode != http.StatusForbidden {
					t.Errorf(
						"GET %s: expected 403 got %d",
						path,
						resp.StatusCode,
					)
				}
			},
		)
	}
}
