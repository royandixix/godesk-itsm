package category

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type manageInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active,omitempty"`
}

func categorySlug(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	var b strings.Builder
	hyphen := false
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			hyphen = false
		} else if !hyphen && b.Len() > 0 {
			b.WriteByte('-')
			hyphen = true
		}
	}
	return strings.Trim(b.String(), "-")
}

func validateCategory(in manageInput) (string, string, error) {
	name := strings.TrimSpace(in.Name)
	if n := utf8.RuneCountInString(name); n < 2 || n > 100 {
		return "", "", errors.New("nama kategori harus 2–100 karakter")
	}
	if utf8.RuneCountInString(in.Description) > 2000 {
		return "", "", errors.New("deskripsi kategori maksimal 2000 karakter")
	}
	slug := categorySlug(name)
	if slug == "" || len(slug) > 120 {
		return "", "", errors.New("nama kategori harus memiliki huruf latin atau angka")
	}
	return name, slug, nil
}

func parseCategoryID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "ID kategori tidak valid"})
		return 0, false
	}
	return id, true
}

func categoryDBError(c *gin.Context, err error) {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			c.JSON(http.StatusConflict, gin.H{"message": "Nama atau slug kategori sudah digunakan"})
			return
		case "23503":
			c.JSON(http.StatusConflict, gin.H{"message": "Kategori masih digunakan oleh tiket atau artikel, nonaktifkan saja"})
			return
		}
	}
	c.JSON(http.StatusInternalServerError, gin.H{"message": "Gagal memproses kategori"})
}

func scanCategoryRow(row interface{ Scan(...any) error }) (Category, error) {
	var item Category
	err := row.Scan(&item.ID, &item.Name, &item.Slug, &item.Description,
		&item.IsActive, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

const categoryColumns = `id, name, slug, description, is_active, created_at, updated_at`

func (h *Handler) ListAll(c *gin.Context) {
	rows, err := h.repository.db.Query(c.Request.Context(),
		`SELECT `+categoryColumns+` FROM categories ORDER BY is_active DESC, name ASC`)
	if err != nil {
		categoryDBError(c, err)
		return
	}
	defer rows.Close()
	items := make([]Category, 0)
	for rows.Next() {
		item, err := scanCategoryRow(rows)
		if err != nil {
			categoryDBError(c, err)
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		categoryDBError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *Handler) Create(c *gin.Context) {
	var input manageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Format kategori tidak valid"})
		return
	}
	name, slug, err := validateCategory(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	active := true
	if input.IsActive != nil {
		active = *input.IsActive
	}
	item, err := scanCategoryRow(h.repository.db.QueryRow(c.Request.Context(),
		`INSERT INTO categories (name, slug, description, is_active)
         VALUES ($1, $2, NULLIF($3, ''), $4) RETURNING `+categoryColumns,
		name, slug, strings.TrimSpace(input.Description), active))
	if err != nil {
		categoryDBError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": item, "message": "Kategori berhasil dibuat"})
}

func (h *Handler) Update(c *gin.Context) {
	id, ok := parseCategoryID(c)
	if !ok {
		return
	}
	var input manageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Format kategori tidak valid"})
		return
	}
	name, slug, err := validateCategory(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	item, err := scanCategoryRow(h.repository.db.QueryRow(c.Request.Context(),
		`UPDATE categories SET name=$2, slug=$3, description=NULLIF($4, ''), updated_at=NOW()
         WHERE id=$1 RETURNING `+categoryColumns,
		id, name, slug, strings.TrimSpace(input.Description)))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"message": "Kategori tidak ditemukan"})
			return
		}
		categoryDBError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item, "message": "Kategori diperbarui"})
}

func (h *Handler) UpdateStatus(c *gin.Context) {
	id, ok := parseCategoryID(c)
	if !ok {
		return
	}
	var input struct {
		IsActive *bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.IsActive == nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Status aktif wajib diisi"})
		return
	}
	item, err := scanCategoryRow(h.repository.db.QueryRow(c.Request.Context(),
		`UPDATE categories SET is_active=$2, updated_at=NOW()
         WHERE id=$1 RETURNING `+categoryColumns, id, *input.IsActive))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"message": "Kategori tidak ditemukan"})
			return
		}
		categoryDBError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item, "message": "Status kategori diperbarui"})
}

func (h *Handler) Delete(c *gin.Context) {
	id, ok := parseCategoryID(c)
	if !ok {
		return
	}
	tag, err := h.repository.db.Exec(c.Request.Context(), `
        DELETE FROM categories WHERE id=$1
        AND NOT EXISTS (SELECT 1 FROM tickets WHERE category_id=$1)
        AND NOT EXISTS (SELECT 1 FROM knowledge_articles WHERE category_id=$1)
    `, id)
	if err != nil {
		categoryDBError(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		var exists bool
		if err := h.repository.db.QueryRow(c.Request.Context(),
			`SELECT EXISTS (SELECT 1 FROM categories WHERE id=$1)`, id).Scan(&exists); err != nil {
			categoryDBError(c, err)
			return
		}
		if exists {
			c.JSON(http.StatusConflict, gin.H{"message": "Kategori masih digunakan oleh tiket atau artikel, nonaktifkan saja"})
		} else {
			c.JSON(http.StatusNotFound, gin.H{"message": "Kategori tidak ditemukan"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Kategori berhasil dihapus"})
}
