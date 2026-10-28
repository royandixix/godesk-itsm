package reports

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func filterContext(query string) *gin.Context {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/reports"+query,
		nil,
	)
	return c
}

func TestReadFilterValid(t *testing.T) {
	c := filterContext(
		"?from=2026-09-13&to=2026-10-12" +
			"&status=OPEN&priority=HIGH" +
			"&category_id=2&agent_id=3" +
			"&limit=50&offset=10",
	)

	f, err := readFilter(c)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if f.FromDate != "2026-09-13" {
		t.Errorf("wrong from date: %s", f.FromDate)
	}

	if f.ToDate != "2026-10-12" {
		t.Errorf("wrong to date: %s", f.ToDate)
	}

	if got := f.ToExclusive.Format("2006-01-02"); got != "2026-10-13" {
		t.Errorf("exclusive date: %s", got)
	}

	if f.Status != "OPEN" {
		t.Errorf("wrong status: %s", f.Status)
	}

	if f.Priority != "HIGH" {
		t.Errorf("wrong priority: %s", f.Priority)
	}

	if f.CategoryID != 2 || f.AgentID != 3 {
		t.Error("category or agent filter mismatch")
	}

	if f.Limit != 50 || f.Offset != 10 {
		t.Error("pagination mismatch")
	}

	if f.From.Location().String() != "Asia/Makassar" {
		t.Error("incorrect timezone")
	}
}

func TestReadFilterInvalid(t *testing.T) {
	tests := []struct {
		name  string
		query string
	}{
		{
			"Invalid date",
			"?from=2026-99-01&to=2026-10-12",
		},
		{
			"Reversed date",
			"?from=2026-10-12&to=2026-09-13",
		},
		{
			"Date range too long",
			"?from=2024-01-01&to=2026-10-12",
		},
		{
			"Invalid status",
			"?status=INVALID",
		},
		{
			"Invalid priority",
			"?priority=INVALID",
		},
		{
			"Invalid category ID",
			"?category_id=abc",
		},
		{
			"Invalid agent ID",
			"?agent_id=-1",
		},
		{
			"Invalid limit",
			"?limit=500",
		},
		{
			"Invalid offset",
			"?offset=-1",
		},
		{
			"SQL injection in ID",
			"?category_id=1%20OR%201%3D1",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			c := filterContext(test.query)

			_, err := readFilter(c)
			if err == nil {
				t.Errorf("expected validation error")
			}
		})
	}
}

func TestSafeCSV(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Normal text", "Normal text"},
		{"=SUM(A1:A2)", "'=SUM(A1:A2)"},
		{"+123", "'+123"},
		{"-123", "'-123"},
		{"@SUM(A1)", "'@SUM(A1)"},
		{" =HYPERLINK()", "'=HYPERLINK()"},
		{"\t=1+1", "'=1+1"},
	}

	for _, test := range tests {
		t.Run(test.input, func(t *testing.T) {
			got := safeCSV(test.input)
			if got != test.expected {
				t.Errorf(
					"safeCSV(%q) = %q, want %q",
					test.input,
					got,
					test.expected,
				)
			}
		})
	}
}
