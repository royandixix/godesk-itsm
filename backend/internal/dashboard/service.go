package dashboard

import (
	"context"
	"time"
)

type Service struct {
	repository *Repository
}

func NewService(
	repository *Repository,
) *Service {
	return &Service{
		repository: repository,
	}
}

func (s *Service) Get(
	ctx context.Context,
	actor Actor,
) (*Data, error) {
	year :=
		time.Now().Year()

	return s.repository.Get(
		ctx,
		actor,
		year,
	)
}
