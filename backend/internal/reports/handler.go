package reports

import (
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	repository *Repository
}

func NewHandler(repository *Repository) *Handler {
	return &Handler{repository: repository}
}

func readFilter(c *gin.Context) (Filter, error) {
	loc, err := time.LoadLocation("Asia/Makassar")
	if err != nil {
		return Filter{}, err
	}

	now := time.Now().In(loc)
	today := time.Date(
		now.Year(), now.Month(), now.Day(),
		0, 0, 0, 0, loc,
	)

	fromDefault := today.AddDate(0, 0, -29).Format("2006-01-02")
	toDefault := today.Format("2006-01-02")

	fromDate := c.DefaultQuery("from", fromDefault)
	toDate := c.DefaultQuery("to", toDefault)

	from, err := time.ParseInLocation("2006-01-02", fromDate, loc)
	if err != nil {
		return Filter{}, fmt.Errorf("tanggal awal harus YYYY-MM-DD")
	}

	to, err := time.ParseInLocation("2006-01-02", toDate, loc)
	if err != nil {
		return Filter{}, fmt.Errorf("tanggal akhir harus YYYY-MM-DD")
	}

	end := to.AddDate(0, 0, 1)

	if from.After(to) || end.Sub(from) > 366*24*time.Hour {
		return Filter{}, fmt.Errorf("rentang tanggal harus 1 sampai 366 hari")
	}

	f := Filter{
		From:        from,
		ToExclusive: end,
		FromDate:    fromDate,
		ToDate:      toDate,
		Status:      strings.ToUpper(strings.TrimSpace(c.Query("status"))),
		Priority:    strings.ToUpper(strings.TrimSpace(c.Query("priority"))),
		Limit:       20,
	}

	switch f.Status {
	case "", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED":
	default:
		return Filter{}, fmt.Errorf("status tidak valid")
	}

	switch f.Priority {
	case "", "LOW", "MEDIUM", "HIGH", "URGENT":
	default:
		return Filter{}, fmt.Errorf("prioritas tidak valid")
	}

	for _, field := range []struct {
		key         string
		destination *int64
	}{
		{"category_id", &f.CategoryID},
		{"agent_id", &f.AgentID},
	} {
		value := c.Query(field.key)
		if value == "" {
			continue
		}

		id, err := strconv.ParseInt(value, 10, 64)
		if err != nil || id < 1 {
			return Filter{}, fmt.Errorf("%s tidak valid", field.key)
		}
		*field.destination = id
	}

	if v := c.Query("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 100 {
			return Filter{}, fmt.Errorf("limit harus 1-100")
		}
		f.Limit = n
	}

	if v := c.Query("offset"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 || n > 1000000 {
			return Filter{}, fmt.Errorf("offset tidak valid")
		}
		f.Offset = n
	}

	return f, nil
}

func (h *Handler) Dashboard(c *gin.Context) {
	f, err := readFilter(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	data, err := h.repository.Get(c.Request.Context(), f)
	if err != nil {
		log.Printf("[REPORTS] %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal memuat laporan",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": data})
}

func (h *Handler) Options(c *gin.Context) {
	value, err := h.repository.Options(c.Request.Context())
	if err != nil {
		log.Printf("[REPORT OPTIONS] %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal memuat filter laporan",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": value})
}

func safeCSV(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}
	switch s[0] {
	case '=', '+', '-', '@', '\t', '\r', '\n':
		return "'" + s
	}
	return s
}

func (h *Handler) ExportCSV(c *gin.Context) {
	f, err := readFilter(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	items, err := h.repository.GetTickets(
		c.Request.Context(), f, 10001, 0,
	)
	if err != nil {
		log.Printf("[REPORTS CSV] %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengekspor laporan",
		})
		return
	}

	if len(items) > 10000 {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"message": "Maksimal 10.000 tiket per ekspor. Persempit filter tanggal.",
		})
		return
	}

	filename := "godesk-reports-" + f.FromDate + "-" + f.ToDate + ".csv"

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(
		"attachment; filename=%q", filename,
	))
	c.Header("Cache-Control", "no-store")

	_, _ = c.Writer.Write([]byte("\xef\xbb\xbf"))

	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{
		"Nomor Tiket",
		"Subjek",
		"Kategori",
		"Pelanggan",
		"Agent",
		"Status",
		"Prioritas",
		"SLA Respons",
		"SLA Penyelesaian",
		"Dibuat (Makassar)",
	})

	loc, _ := time.LoadLocation("Asia/Makassar")

	for _, t := range items {
		_ = w.Write([]string{
			safeCSV(t.Number),
			safeCSV(t.Subject),
			safeCSV(t.Category),
			safeCSV(t.Customer),
			safeCSV(t.Agent),
			t.Status,
			t.Priority,
			t.SlaResponse,
			t.SlaResolution,
			t.CreatedAt.In(loc).Format("2006-01-02 15:04"),
		})
	}

	w.Flush()
	if err := w.Error(); err != nil {
		log.Printf("[REPORTS CSV] %v", err)
	}
}
