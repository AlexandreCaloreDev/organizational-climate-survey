package usecase

import (
	"context"
	"fmt"
	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/domain/repository"
)

type CicloUseCase struct {
	repo repository.CicloRepository
}

func NewCicloUseCase(repo repository.CicloRepository) *CicloUseCase {
	return &CicloUseCase{
		repo: repo,
	}
}

func (uc *CicloUseCase) Create(ctx context.Context, idEmpresa int, nome string, recorrencia *string) (*entity.CicloAvaliacao, error) {
	if nome == "" {
		return nil, fmt.Errorf("nome do ciclo é obrigatório")
	}

	ciclo := &entity.CicloAvaliacao{
		IDEmpresa:   idEmpresa,
		Nome:        nome,
		Recorrencia: recorrencia,
	}

	if err := uc.repo.Create(ctx, ciclo); err != nil {
		return nil, err
	}

	return ciclo, nil
}

func (uc *CicloUseCase) GetByID(ctx context.Context, id int) (*entity.CicloAvaliacao, error) {
	return uc.repo.GetByID(ctx, id)
}

func (uc *CicloUseCase) ListByEmpresa(ctx context.Context, idEmpresa int) ([]entity.CicloAvaliacao, error) {
	return uc.repo.ListByEmpresa(ctx, idEmpresa)
}

func (uc *CicloUseCase) Update(ctx context.Context, id int, nome string, recorrencia *string) error {
	ciclo, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if nome != "" {
		ciclo.Nome = nome
	}
	ciclo.Recorrencia = recorrencia

	return uc.repo.Update(ctx, ciclo)
}

func (uc *CicloUseCase) Delete(ctx context.Context, id int) error {
	return uc.repo.Delete(ctx, id)
}
