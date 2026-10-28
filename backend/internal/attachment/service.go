package attachment

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/royandixix/godesk/backend/internal/ticket"
	"github.com/royandixix/godesk/backend/internal/user"
)

const defaultMaxSizeBytes int64 = 10 * 1024 * 1024

var allowedExtensions = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".webp": {},
	".pdf":  {},
	".txt":  {},
	".doc":  {},
	".docx": {},
	".xls":  {},
	".xlsx": {},
}

type Service struct {
	repository *Repository

	ticketService *ticket.Service

	storagePath string

	maxSizeBytes int64
}

func NewService(
	repository *Repository,
	ticketService *ticket.Service,
	storagePath string,
	maxSizeBytes int64,
) *Service {
	storagePath =
		strings.TrimSpace(
			storagePath,
		)

	if storagePath == "" {
		storagePath =
			"storage/attachments"
	}

	if maxSizeBytes <= 0 {
		maxSizeBytes =
			defaultMaxSizeBytes
	}

	return &Service{
		repository: repository,

		ticketService: ticketService,

		storagePath: storagePath,

		maxSizeBytes: maxSizeBytes,
	}
}

func (s *Service) MaxUploadBytes() int64 {
	return s.maxSizeBytes
}

func (s *Service) List(
	ctx context.Context,
	actor ticket.Actor,
	ticketID int64,
) ([]Attachment, error) {
	if ticketID <= 0 {
		return nil,
			ErrInvalidInput
	}

	_, err :=
		s.ticketService.GetByID(
			ctx,
			actor,
			ticketID,
		)
	if err != nil {
		return nil, err
	}

	return s.repository.ListByTicket(
		ctx,
		ticketID,
	)
}

func (s *Service) Upload(
	ctx context.Context,
	actor ticket.Actor,
	ticketID int64,
	header *multipart.FileHeader,
) (*Attachment, error) {
	if ticketID <= 0 {
		return nil,
			ErrInvalidInput
	}

	if header == nil {
		return nil,
			ErrFileRequired
	}

	_, err :=
		s.ticketService.GetByID(
			ctx,
			actor,
			ticketID,
		)
	if err != nil {
		return nil, err
	}

	if header.Size <= 0 {
		return nil,
			ErrFileRequired
	}

	if header.Size >
		s.maxSizeBytes {
		return nil,
			ErrFileTooLarge
	}

	originalName, err :=
		cleanOriginalName(
			header.Filename,
		)
	if err != nil {
		return nil, err
	}

	extension :=
		strings.ToLower(
			filepath.Ext(
				originalName,
			),
		)

	if _, allowed := allowedExtensions[extension]; !allowed {
		return nil, ErrFileTypeNotAllowed
	}

	source, err :=
		header.Open()
	if err != nil {
		return nil,
			fmt.Errorf(
				"%w: gagal membuka file",
				ErrStorage,
			)
	}

	defer source.Close()

	buffer :=
		make(
			[]byte,
			512,
		)

	readBytes, readErr :=
		source.Read(
			buffer,
		)

	if readErr != nil &&
		!errors.Is(
			readErr,
			io.EOF,
		) {
		return nil,
			fmt.Errorf(
				"%w: gagal membaca file",
				ErrStorage,
			)
	}

	if readBytes <= 0 {
		return nil,
			ErrFileRequired
	}

	detectedMime :=
		http.DetectContentType(
			buffer[:readBytes],
		)

	if forbiddenDetectedMime(
		detectedMime,
	) {
		return nil,
			ErrFileTypeNotAllowed
	}

	if _, err :=
		source.Seek(
			0,
			io.SeekStart,
		); err != nil {
		return nil,
			fmt.Errorf(
				"%w: gagal membaca ulang file",
				ErrStorage,
			)
	}

	mimeType :=
		resolveMimeType(
			header,
			extension,
			detectedMime,
		)

	storedName, err :=
		generateStoredName(
			extension,
		)
	if err != nil {
		return nil,
			fmt.Errorf(
				"%w: gagal membuat nama file",
				ErrStorage,
			)
	}

	rootPath, err :=
		s.storageRoot()
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(
		rootPath,
		0750,
	); err != nil {
		return nil,
			fmt.Errorf(
				"%w: gagal membuat direktori storage",
				ErrStorage,
			)
	}

	destinationPath :=
		filepath.Join(
			rootPath,
			storedName,
		)

	destination, err :=
		os.OpenFile(
			destinationPath,
			os.O_CREATE|
				os.O_EXCL|
				os.O_WRONLY,
			0640,
		)
	if err != nil {
		return nil,
			fmt.Errorf(
				"%w: gagal membuat file",
				ErrStorage,
			)
	}

	written, copyErr :=
		io.Copy(
			destination,
			io.LimitReader(
				source,
				s.maxSizeBytes+1,
			),
		)

	closeErr :=
		destination.Close()

	if copyErr != nil {
		_ = os.Remove(
			destinationPath,
		)

		return nil,
			fmt.Errorf(
				"%w: gagal menulis file",
				ErrStorage,
			)
	}

	if closeErr != nil {
		_ = os.Remove(
			destinationPath,
		)

		return nil,
			fmt.Errorf(
				"%w: gagal menutup file",
				ErrStorage,
			)
	}

	if written <= 0 {
		_ = os.Remove(
			destinationPath,
		)

		return nil,
			ErrFileRequired
	}

	if written >
		s.maxSizeBytes {
		_ = os.Remove(
			destinationPath,
		)

		return nil,
			ErrFileTooLarge
	}

	storagePath :=
		filepath.ToSlash(
			filepath.Join(
				s.storagePath,
				storedName,
			),
		)

	item, err :=
		s.repository.Create(
			ctx,
			CreateInput{
				TicketID: ticketID,

				UploadedBy: actor.UserID,

				OriginalName: originalName,

				StoredName: storedName,

				StoragePath: storagePath,

				MimeType: mimeType,

				FileExtension: extension,

				SizeBytes: written,
			},
		)
	if err != nil {
		_ = os.Remove(
			destinationPath,
		)

		return nil, err
	}

	return item, nil
}

func (s *Service) GetDownload(
	ctx context.Context,
	actor ticket.Actor,
	id int64,
) (
	*Attachment,
	string,
	error,
) {
	if id <= 0 {
		return nil,
			"",
			ErrInvalidInput
	}

	item, err :=
		s.repository.FindByID(
			ctx,
			id,
		)
	if err != nil {
		return nil,
			"",
			err
	}

	_, err =
		s.ticketService.GetByID(
			ctx,
			actor,
			item.TicketID,
		)
	if err != nil {
		return nil,
			"",
			err
	}

	path, err :=
		s.resolveStoredFile(
			item.StoredName,
		)
	if err != nil {
		return nil,
			"",
			err
	}

	info, err :=
		os.Stat(
			path,
		)
	if errors.Is(
		err,
		os.ErrNotExist,
	) {
		return nil,
			"",
			ErrNotFound
	}

	if err != nil {
		return nil,
			"",
			fmt.Errorf(
				"%w: gagal membaca file",
				ErrStorage,
			)
	}

	if !info.Mode().IsRegular() {
		return nil,
			"",
			ErrNotFound
	}

	return item,
		path,
		nil
}

func (s *Service) Delete(
	ctx context.Context,
	actor ticket.Actor,
	id int64,
) error {
	if id <= 0 {
		return ErrInvalidInput
	}

	item, err :=
		s.repository.FindByID(
			ctx,
			id,
		)
	if err != nil {
		return err
	}

	_, err =
		s.ticketService.GetByID(
			ctx,
			actor,
			item.TicketID,
		)
	if err != nil {
		return err
	}

	if !canDelete(
		actor,
		item,
	) {
		return ErrForbidden
	}

	if err :=
		s.repository.Delete(
			ctx,
			id,
		); err != nil {
		return err
	}

	path, pathErr :=
		s.resolveStoredFile(
			item.StoredName,
		)
	if pathErr != nil {
		log.Printf(
			"attachment cleanup warning: %v",
			pathErr,
		)

		return nil
	}

	if err := os.Remove(
		path,
	); err != nil &&
		!errors.Is(
			err,
			os.ErrNotExist,
		) {
		log.Printf(
			"attachment cleanup warning: gagal menghapus file %s: %v",
			item.StoredName,
			err,
		)
	}

	return nil
}

func (s *Service) storageRoot() (
	string,
	error,
) {
	root, err :=
		filepath.Abs(
			s.storagePath,
		)
	if err != nil {
		return "",
			fmt.Errorf(
				"%w: path storage tidak valid",
				ErrStorage,
			)
	}

	return root, nil
}

func (s *Service) resolveStoredFile(
	storedName string,
) (
	string,
	error,
) {
	storedName =
		filepath.Base(
			strings.TrimSpace(
				storedName,
			),
		)

	if storedName == "" ||
		storedName == "." {
		return "",
			ErrNotFound
	}

	root, err :=
		s.storageRoot()
	if err != nil {
		return "", err
	}

	path :=
		filepath.Join(
			root,
			storedName,
		)

	return path, nil
}

func cleanOriginalName(
	value string,
) (
	string,
	error,
) {
	value =
		strings.ReplaceAll(
			value,
			"\\",
			"/",
		)

	value =
		filepath.Base(
			strings.TrimSpace(
				value,
			),
		)

	if value == "" ||
		value == "." {
		return "",
			ErrFileRequired
	}

	if len(
		[]byte(value),
	) > 255 {
		return "",
			ErrInvalidInput
	}

	return value, nil
}

func generateStoredName(
	extension string,
) (
	string,
	error,
) {
	randomBytes :=
		make(
			[]byte,
			24,
		)

	if _, err := rand.Read(
		randomBytes,
	); err != nil {
		return "", err
	}

	return hex.EncodeToString(
			randomBytes,
		) + extension,
		nil
}

func resolveMimeType(
	header *multipart.FileHeader,
	extension string,
	detected string,
) string {
	contentType :=
		strings.TrimSpace(
			header.Header.Get(
				"Content-Type",
			),
		)

	if contentType != "" {
		contentType =
			strings.TrimSpace(
				strings.Split(
					contentType,
					";",
				)[0],
			)
	}

	if contentType == "" ||
		contentType ==
			"application/octet-stream" {
		extensionMime :=
			mime.TypeByExtension(
				extension,
			)

		if extensionMime != "" {
			contentType =
				strings.TrimSpace(
					strings.Split(
						extensionMime,
						";",
					)[0],
				)
		}
	}

	if contentType == "" {
		contentType =
			detected
	}

	if contentType == "" {
		contentType =
			"application/octet-stream"
	}

	return contentType
}

func forbiddenDetectedMime(
	value string,
) bool {
	value =
		strings.ToLower(
			strings.TrimSpace(
				value,
			),
		)

	switch value {
	case "image/svg+xml",
		"text/html",
		"application/javascript",
		"text/javascript",
		"application/x-msdownload",
		"application/x-dosexec":
		return true

	default:
		return false
	}
}

func canDelete(
	actor ticket.Actor,
	item *Attachment,
) bool {
	switch actor.Role {
	case user.RoleSuperAdmin,
		user.RoleManager:
		return true

	case user.RoleAgent,
		user.RoleCustomer:
		return item.UploadedBy ==
			actor.UserID

	default:
		return false
	}
}
