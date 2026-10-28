package attachment

import (
	"errors"
	"time"
)

var (
	ErrInvalidInput = errors.New(
		"data lampiran tidak valid",
	)

	ErrFileRequired = errors.New(
		"file lampiran wajib dipilih",
	)

	ErrFileTooLarge = errors.New(
		"ukuran file melebihi batas maksimum",
	)

	ErrFileTypeNotAllowed = errors.New(
		"tipe file tidak diizinkan",
	)

	ErrNotFound = errors.New(
		"lampiran tidak ditemukan",
	)

	ErrForbidden = errors.New(
		"Anda tidak memiliki izin untuk menghapus lampiran ini",
	)

	ErrStorage = errors.New(
		"gagal memproses penyimpanan lampiran",
	)
)

type Attachment struct {
	ID int64 `json:"id"`

	TicketID int64 `json:"ticket_id"`

	UploadedBy int64 `json:"uploaded_by"`

	UploaderName string `json:"uploader_name"`

	OriginalName string `json:"original_name"`

	StoredName string `json:"-"`

	StoragePath string `json:"-"`

	MimeType string `json:"mime_type"`

	FileExtension string `json:"file_extension"`

	SizeBytes int64 `json:"size_bytes"`

	CreatedAt time.Time `json:"created_at"`
}

type CreateInput struct {
	TicketID int64

	UploadedBy int64

	OriginalName string

	StoredName string

	StoragePath string

	MimeType string

	FileExtension string

	SizeBytes int64
}
