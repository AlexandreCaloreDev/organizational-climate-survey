package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/domain/repository"
	"organizational-climate-survey/backend/pkg/logger"
)

type CicloRepository struct {
	db     *DB
	logger logger.Logger
}

func NewCicloRepository(db *DB) *CicloRepository {
	return &CicloRepository{
		db:     db,
		logger: db.logger,
	}
}

var _ repository.CicloRepository = (*CicloRepository)(nil)

func (r *CicloRepository) Create(ctx context.Context, ciclo *entity.CicloAvaliacao) error {
	query := `
        INSERT INTO ciclo_avaliacao (id_empresa, nome, recorrencia, data_criacao, data_atualizacao)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id_ciclo, data_criacao, data_atualizacao
    `
	err := r.db.QueryRowContext(ctx, query, ciclo.IDEmpresa, ciclo.Nome, ciclo.Recorrencia).
		Scan(&ciclo.ID, &ciclo.DataCriacao, &ciclo.DataAtualizacao)
	if err != nil {
		r.logger.Error("erro ao criar ciclo de avaliacao: %v", err)
		return fmt.Errorf("erro ao criar ciclo: %w", err)
	}
	return nil
}

func (r *CicloRepository) GetByID(ctx context.Context, id int) (*entity.CicloAvaliacao, error) {
	query := `
        SELECT id_ciclo, id_empresa, nome, recorrencia, data_criacao, data_atualizacao
        FROM ciclo_avaliacao WHERE id_ciclo = $1
    `
	ciclo := &entity.CicloAvaliacao{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&ciclo.ID, &ciclo.IDEmpresa, &ciclo.Nome, &ciclo.Recorrencia, &ciclo.DataCriacao, &ciclo.DataAtualizacao,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("ciclo com ID %d nao encontrado", id)
		}
		return nil, err
	}
	return ciclo, nil
}

func (r *CicloRepository) ListByEmpresa(ctx context.Context, empresaID int) ([]entity.CicloAvaliacao, error) {
	query := `
        SELECT id_ciclo, id_empresa, nome, recorrencia, data_criacao, data_atualizacao
        FROM ciclo_avaliacao WHERE id_empresa = $1
        ORDER BY data_criacao DESC
    `
	rows, err := r.db.QueryContext(ctx, query, empresaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ciclos []entity.CicloAvaliacao
	for rows.Next() {
		var c entity.CicloAvaliacao
		if err := rows.Scan(&c.ID, &c.IDEmpresa, &c.Nome, &c.Recorrencia, &c.DataCriacao, &c.DataAtualizacao); err != nil {
			return nil, err
		}
		ciclos = append(ciclos, c)
	}
	return ciclos, nil
}

func (r *CicloRepository) Update(ctx context.Context, ciclo *entity.CicloAvaliacao) error {
	query := `
        UPDATE ciclo_avaliacao SET nome = $2, recorrencia = $3, data_atualizacao = CURRENT_TIMESTAMP
        WHERE id_ciclo = $1
    `
	res, err := r.db.ExecContext(ctx, query, ciclo.ID, ciclo.Nome, ciclo.Recorrencia)
	if err != nil {
		return err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return fmt.Errorf("ciclo não encontrado para atualização")
	}
	return nil
}

func (r *CicloRepository) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM ciclo_avaliacao WHERE id_ciclo = $1`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return fmt.Errorf("ciclo não encontrado para deleção")
	}
	return nil
}
