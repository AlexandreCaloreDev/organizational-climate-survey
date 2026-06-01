// Package postgres implementa o repositório de Pesquisa usando PostgreSQL.
// Fornece operações CRUD e consultas específicas para gerenciamento de pesquisas de clima organizacional.
package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/domain/repository"
	"organizational-climate-survey/backend/pkg/logger"
)

// PesquisaRepository implementa a interface repository.PesquisaRepository
type PesquisaRepository struct {
	db     *DB           // Conexão com o banco de dados
	logger logger.Logger // Logger para operações do repositório
}

// NewPesquisaRepository cria uma nova instância do repositório
func NewPesquisaRepository(db *DB) *PesquisaRepository {
	return &PesquisaRepository{
		db:     db,
		logger: db.logger,
	}
}

// Garante que PesquisaRepository implementa a interface correta
var _ repository.PesquisaRepository = (*PesquisaRepository)(nil)

// Create insere uma nova pesquisa no banco de dados
// Retorna o ID gerado através do RETURNING
func (r *PesquisaRepository) Create(ctx context.Context, pesquisa *entity.Pesquisa) error {
	query := `
        INSERT INTO pesquisa (id_empresa, id_user_admin, id_setor, titulo, descricao, 
                            data_criacao, data_abertura, data_fechamento, status, 
                            link_acesso, qrcode_path, config_recorrencia, anonimato, id_ciclo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id_pesquisa
    `

	err := r.db.QueryRowContext(ctx, query,
		pesquisa.IDEmpresa,
		pesquisa.IDUserAdmin,
		pesquisa.IDSetor,
		pesquisa.Titulo,
		pesquisa.Descricao,
		pesquisa.DataCriacao,
		pesquisa.DataAbertura,
		pesquisa.DataFechamento,
		pesquisa.Status,
		pesquisa.LinkAcesso,
		pesquisa.QRCodePath,
		pesquisa.ConfigRecorrencia,
		pesquisa.Anonimato,
		pesquisa.IDCiclo,
	).Scan(&pesquisa.ID)

	if err != nil {
		r.logger.Error("erro ao criar pesquisa titulo=%s: %v", pesquisa.Titulo, err)
		return fmt.Errorf("erro ao criar pesquisa: %v", err)
	}

	return nil
}

// GetByID busca uma pesquisa pelo seu ID
// Retorna erro específico quando não encontrada
func (r *PesquisaRepository) GetByID(ctx context.Context, id int) (*entity.Pesquisa, error) {
	pesquisa := &entity.Pesquisa{}
	query := `
        SELECT p.id_pesquisa, p.id_empresa, p.id_user_admin, p.id_setor, p.titulo, p.descricao,
               p.data_criacao, p.data_abertura, p.data_fechamento, p.status, p.link_acesso,
               p.qrcode_path, p.config_recorrencia, p.anonimato, p.id_ciclo,
               s.nome_setor, s.descricao
        FROM pesquisa p
        LEFT JOIN setor s ON p.id_setor = s.id_setor
        WHERE p.id_pesquisa = $1
    `

	var nullCiclo sql.NullInt32
	var setorNome, setorDesc sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&pesquisa.ID,
		&pesquisa.IDEmpresa,
		&pesquisa.IDUserAdmin,
		&pesquisa.IDSetor,
		&pesquisa.Titulo,
		&pesquisa.Descricao,
		&pesquisa.DataCriacao,
		&pesquisa.DataAbertura,
		&pesquisa.DataFechamento,
		&pesquisa.Status,
		&pesquisa.LinkAcesso,
		&pesquisa.QRCodePath,
		&pesquisa.ConfigRecorrencia,
		&pesquisa.Anonimato,
		&nullCiclo,
		&setorNome,
		&setorDesc,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("pesquisa com ID %d não encontrada", id)
		}
		r.logger.Error("erro ao buscar pesquisa ID=%d: %v", id, err)
		return nil, fmt.Errorf("erro ao buscar pesquisa: %v", err)
	}

	if nullCiclo.Valid {
		v := int(nullCiclo.Int32)
		pesquisa.IDCiclo = &v
	}
	if setorNome.Valid {
		pesquisa.Setor = &entity.Setor{
			ID:        pesquisa.IDSetor,
			IDEmpresa: pesquisa.IDEmpresa,
			NomeSetor: setorNome.String,
			Descricao: setorDesc.String,
		}
	}

	return pesquisa, nil
}

// GetByLinkAcesso busca uma pesquisa pelo seu link de acesso único
// Usado para acesso público à pesquisa
func (r *PesquisaRepository) GetByLinkAcesso(ctx context.Context, link string) (*entity.Pesquisa, error) {
	pesquisa := &entity.Pesquisa{}
	query := `
        SELECT p.id_pesquisa, p.id_empresa, p.id_user_admin, p.id_setor, p.titulo, p.descricao,
               p.data_criacao, p.data_abertura, p.data_fechamento, p.status, p.link_acesso,
               p.qrcode_path, p.config_recorrencia, p.anonimato, p.id_ciclo,
               s.nome_setor, s.descricao
        FROM pesquisa p
        LEFT JOIN setor s ON p.id_setor = s.id_setor
        WHERE p.link_acesso = $1
    `

	var nullCiclo sql.NullInt32
	var setorNome, setorDesc sql.NullString

	err := r.db.QueryRowContext(ctx, query, link).Scan(
		&pesquisa.ID,
		&pesquisa.IDEmpresa,
		&pesquisa.IDUserAdmin,
		&pesquisa.IDSetor,
		&pesquisa.Titulo,
		&pesquisa.Descricao,
		&pesquisa.DataCriacao,
		&pesquisa.DataAbertura,
		&pesquisa.DataFechamento,
		&pesquisa.Status,
		&pesquisa.LinkAcesso,
		&pesquisa.QRCodePath,
		&pesquisa.ConfigRecorrencia,
		&pesquisa.Anonimato,
		&nullCiclo,
		&setorNome,
		&setorDesc,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("pesquisa com link %s não encontrada", link)
		}
		r.logger.Error("erro ao buscar pesquisa por link: %v", err)
		return nil, fmt.Errorf("erro ao buscar pesquisa: %v", err)
	}

	if nullCiclo.Valid {
		v := int(nullCiclo.Int32)
		pesquisa.IDCiclo = &v
	}
	if setorNome.Valid {
		pesquisa.Setor = &entity.Setor{
			ID:        pesquisa.IDSetor,
			IDEmpresa: pesquisa.IDEmpresa,
			NomeSetor: setorNome.String,
			Descricao: setorDesc.String,
		}
	}

	return pesquisa, nil
}

// ListByEmpresa lista todas as pesquisas de uma empresa
// Ordenadas por data de criação decrescente
func (r *PesquisaRepository) ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.Pesquisa, error) {
	query := `
        SELECT p.id_pesquisa, p.id_empresa, p.id_user_admin, p.id_setor, p.titulo, p.descricao,
               p.data_criacao, p.data_abertura, p.data_fechamento, p.status, p.link_acesso,
               p.qrcode_path, p.config_recorrencia, p.anonimato, p.id_ciclo,
               s.nome_setor, s.descricao
        FROM pesquisa p
        LEFT JOIN setor s ON p.id_setor = s.id_setor
        WHERE p.id_empresa = $1
        ORDER BY p.data_criacao DESC
    `

	rows, err := r.db.QueryContext(ctx, query, empresaID)
	if err != nil {
		r.logger.Error("erro ao listar pesquisas empresa ID=%d: %v", empresaID, err)
		return nil, fmt.Errorf("erro ao listar pesquisas: %v", err)
	}
	defer rows.Close()

	var pesquisas []*entity.Pesquisa

	for rows.Next() {
		pesquisa := &entity.Pesquisa{}
		var nullCiclo sql.NullInt32
		var setorNome, setorDesc sql.NullString
		err := rows.Scan(
			&pesquisa.ID,
			&pesquisa.IDEmpresa,
			&pesquisa.IDUserAdmin,
			&pesquisa.IDSetor,
			&pesquisa.Titulo,
			&pesquisa.Descricao,
			&pesquisa.DataCriacao,
			&pesquisa.DataAbertura,
			&pesquisa.DataFechamento,
			&pesquisa.Status,
			&pesquisa.LinkAcesso,
			&pesquisa.QRCodePath,
			&pesquisa.ConfigRecorrencia,
			&pesquisa.Anonimato,
			&nullCiclo,
			&setorNome,
			&setorDesc,
		)
		if err != nil {
			r.logger.Error("erro ao escanear pesquisa: %v", err)
			return nil, fmt.Errorf("erro ao escanear pesquisa: %v", err)
		}
		if nullCiclo.Valid {
			v := int(nullCiclo.Int32)
			pesquisa.IDCiclo = &v
		}
		if setorNome.Valid {
			pesquisa.Setor = &entity.Setor{
				ID:        pesquisa.IDSetor,
				IDEmpresa: pesquisa.IDEmpresa,
				NomeSetor: setorNome.String,
				Descricao: setorDesc.String,
			}
		}
		pesquisas = append(pesquisas, pesquisa)
	}

	if err = rows.Err(); err != nil {
		r.logger.Error("erro ao iterar pesquisas: %v", err)
		return nil, fmt.Errorf("erro ao iterar pesquisas: %v", err)
	}

	return pesquisas, nil
}

// ListBySetor lista todas as pesquisas de um setor específico
// Ordenadas por data de criação decrescente
func (r *PesquisaRepository) ListBySetor(ctx context.Context, setorID int) ([]*entity.Pesquisa, error) {
	query := `
        SELECT p.id_pesquisa, p.id_empresa, p.id_user_admin, p.id_setor, p.titulo, p.descricao,
               p.data_criacao, p.data_abertura, p.data_fechamento, p.status, p.link_acesso,
               p.qrcode_path, p.config_recorrencia, p.anonimato, p.id_ciclo,
               s.nome_setor, s.descricao
        FROM pesquisa p
        LEFT JOIN setor s ON p.id_setor = s.id_setor
        WHERE p.id_setor = $1
        ORDER BY p.data_criacao DESC
    `

	rows, err := r.db.QueryContext(ctx, query, setorID)
	if err != nil {
		r.logger.Error("erro ao listar pesquisas setor ID=%d: %v", setorID, err)
		return nil, fmt.Errorf("erro ao listar pesquisas por setor: %v", err)
	}
	defer rows.Close()

	var pesquisas []*entity.Pesquisa

	for rows.Next() {
		pesquisa := &entity.Pesquisa{}
		var nullCiclo sql.NullInt32
		var setorNome, setorDesc sql.NullString
		err := rows.Scan(
			&pesquisa.ID,
			&pesquisa.IDEmpresa,
			&pesquisa.IDUserAdmin,
			&pesquisa.IDSetor,
			&pesquisa.Titulo,
			&pesquisa.Descricao,
			&pesquisa.DataCriacao,
			&pesquisa.DataAbertura,
			&pesquisa.DataFechamento,
			&pesquisa.Status,
			&pesquisa.LinkAcesso,
			&pesquisa.QRCodePath,
			&pesquisa.ConfigRecorrencia,
			&pesquisa.Anonimato,
			&nullCiclo,
			&setorNome,
			&setorDesc,
		)
		if err != nil {
			r.logger.Error("erro ao escanear pesquisa: %v", err)
			return nil, fmt.Errorf("erro ao escanear pesquisa: %v", err)
		}
		if nullCiclo.Valid {
			v := int(nullCiclo.Int32)
			pesquisa.IDCiclo = &v
		}
		if setorNome.Valid {
			pesquisa.Setor = &entity.Setor{
				ID:        pesquisa.IDSetor,
				IDEmpresa: pesquisa.IDEmpresa,
				NomeSetor: setorNome.String,
				Descricao: setorDesc.String,
			}
		}
		pesquisas = append(pesquisas, pesquisa)
	}

	if err = rows.Err(); err != nil {
		r.logger.Error("erro ao iterar pesquisas: %v", err)
		return nil, fmt.Errorf("erro ao iterar pesquisas: %v", err)
	}

	return pesquisas, nil
}

// ListByStatus lista pesquisas de uma empresa filtradas por status
// Status podem ser: Rascunho, Ativa, Pausada, Encerrada, Arquivada
func (r *PesquisaRepository) ListByStatus(ctx context.Context, empresaID int, status string) ([]*entity.Pesquisa, error) {
	query := `
        SELECT p.id_pesquisa, p.id_empresa, p.id_user_admin, p.id_setor, p.titulo, p.descricao,
               p.data_criacao, p.data_abertura, p.data_fechamento, p.status, p.link_acesso,
               p.qrcode_path, p.config_recorrencia, p.anonimato, p.id_ciclo,
               s.nome_setor, s.descricao
        FROM pesquisa p
        LEFT JOIN setor s ON p.id_setor = s.id_setor
        WHERE p.id_empresa = $1 AND p.status = $2
        ORDER BY p.data_criacao DESC
    `

	rows, err := r.db.QueryContext(ctx, query, empresaID, status)
	if err != nil {
		r.logger.Error("erro ao listar pesquisas por status empresa ID=%d: %v", empresaID, err)
		return nil, fmt.Errorf("erro ao listar pesquisas por status: %v", err)
	}
	defer rows.Close()

	var pesquisas []*entity.Pesquisa

	for rows.Next() {
		pesquisa := &entity.Pesquisa{}
		var nullCiclo sql.NullInt32
		var setorNome, setorDesc sql.NullString
		err := rows.Scan(
			&pesquisa.ID,
			&pesquisa.IDEmpresa,
			&pesquisa.IDUserAdmin,
			&pesquisa.IDSetor,
			&pesquisa.Titulo,
			&pesquisa.Descricao,
			&pesquisa.DataCriacao,
			&pesquisa.DataAbertura,
			&pesquisa.DataFechamento,
			&pesquisa.Status,
			&pesquisa.LinkAcesso,
			&pesquisa.QRCodePath,
			&pesquisa.ConfigRecorrencia,
			&pesquisa.Anonimato,
			&nullCiclo,
			&setorNome,
			&setorDesc,
		)
		if err != nil {
			r.logger.Error("erro ao escanear pesquisa: %v", err)
			return nil, fmt.Errorf("erro ao escanear pesquisa: %v", err)
		}
		if nullCiclo.Valid {
			v := int(nullCiclo.Int32)
			pesquisa.IDCiclo = &v
		}
		if setorNome.Valid {
			pesquisa.Setor = &entity.Setor{
				ID:        pesquisa.IDSetor,
				IDEmpresa: pesquisa.IDEmpresa,
				NomeSetor: setorNome.String,
				Descricao: setorDesc.String,
			}
		}
		pesquisas = append(pesquisas, pesquisa)
	}

	if err = rows.Err(); err != nil {
		r.logger.Error("erro ao iterar pesquisas: %v", err)
		return nil, fmt.Errorf("erro ao iterar pesquisas: %v", err)
	}

	return pesquisas, nil
}

// ListActive lista pesquisas ativas dentro do período de abertura/fechamento
// Considera apenas pesquisas com status 'Ativa'
func (r *PesquisaRepository) ListActive(ctx context.Context, empresaID int) ([]*entity.Pesquisa, error) {
	query := `
        SELECT p.id_pesquisa, p.id_empresa, p.id_user_admin, p.id_setor, p.titulo, p.descricao,
               p.data_criacao, p.data_abertura, p.data_fechamento, p.status, p.link_acesso,
               p.qrcode_path, p.config_recorrencia, p.anonimato, p.id_ciclo,
               s.nome_setor, s.descricao
        FROM pesquisa p
        LEFT JOIN setor s ON p.id_setor = s.id_setor
        WHERE p.id_empresa = $1 AND p.status = 'Ativa'
        AND (p.data_abertura IS NULL OR p.data_abertura <= NOW())
        AND (p.data_fechamento IS NULL OR p.data_fechamento > NOW())
        ORDER BY p.data_criacao DESC
    `

	rows, err := r.db.QueryContext(ctx, query, empresaID)
	if err != nil {
		r.logger.Error("erro ao listar pesquisas ativas empresa ID=%d: %v", empresaID, err)
		return nil, fmt.Errorf("erro ao listar pesquisas ativas: %v", err)
	}
	defer rows.Close()

	var pesquisas []*entity.Pesquisa

	for rows.Next() {
		pesquisa := &entity.Pesquisa{}
		var nullCiclo sql.NullInt32
		var setorNome, setorDesc sql.NullString
		err := rows.Scan(
			&pesquisa.ID,
			&pesquisa.IDEmpresa,
			&pesquisa.IDUserAdmin,
			&pesquisa.IDSetor,
			&pesquisa.Titulo,
			&pesquisa.Descricao,
			&pesquisa.DataCriacao,
			&pesquisa.DataAbertura,
			&pesquisa.DataFechamento,
			&pesquisa.Status,
			&pesquisa.LinkAcesso,
			&pesquisa.QRCodePath,
			&pesquisa.ConfigRecorrencia,
			&pesquisa.Anonimato,
			&nullCiclo,
			&setorNome,
			&setorDesc,
		)
		if err != nil {
			r.logger.Error("erro ao escanear pesquisa: %v", err)
			return nil, fmt.Errorf("erro ao escanear pesquisa: %v", err)
		}
		if nullCiclo.Valid {
			v := int(nullCiclo.Int32)
			pesquisa.IDCiclo = &v
		}
		if setorNome.Valid {
			pesquisa.Setor = &entity.Setor{
				ID:        pesquisa.IDSetor,
				IDEmpresa: pesquisa.IDEmpresa,
				NomeSetor: setorNome.String,
				Descricao: setorDesc.String,
			}
		}
		pesquisas = append(pesquisas, pesquisa)
	}

	if err = rows.Err(); err != nil {
		r.logger.Error("erro ao iterar pesquisas: %v", err)
		return nil, fmt.Errorf("erro ao iterar pesquisas: %v", err)
	}

	return pesquisas, nil
}

// Update atualiza os dados de uma pesquisa existente
// Retorna erro se a pesquisa não for encontrada
func (r *PesquisaRepository) Update(ctx context.Context, pesquisa *entity.Pesquisa) error {
	query := `
        UPDATE pesquisa 
        SET titulo = $2, descricao = $3, data_abertura = $4, data_fechamento = $5,
            status = $6, qrcode_path = $7, config_recorrencia = $8, id_ciclo = $9
        WHERE id_pesquisa = $1
    `

	result, err := r.db.ExecContext(ctx, query,
		pesquisa.ID,
		pesquisa.Titulo,
		pesquisa.Descricao,
		pesquisa.DataAbertura,
		pesquisa.DataFechamento,
		pesquisa.Status,
		pesquisa.QRCodePath,
		pesquisa.ConfigRecorrencia,
		pesquisa.IDCiclo,
	)

	if err != nil {
		r.logger.Error("erro ao atualizar pesquisa ID=%d: %v", pesquisa.ID, err)
		return fmt.Errorf("erro ao atualizar pesquisa: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("erro ao verificar linhas afetadas: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("pesquisa com ID %d não encontrada para atualização", pesquisa.ID)
	}

	return nil
}

// UpdateStatus atualiza apenas o status de uma pesquisa
// Usado para transições de estado: ativar, pausar, encerrar, etc
func (r *PesquisaRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	query := `
        UPDATE pesquisa 
        SET status = $2
        WHERE id_pesquisa = $1
    `

	result, err := r.db.ExecContext(ctx, query, id, status)
	if err != nil {
		r.logger.Error("erro ao atualizar status pesquisa ID=%d: %v", id, err)
		return fmt.Errorf("erro ao atualizar status da pesquisa: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("erro ao verificar linhas afetadas: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("pesquisa com ID %d não encontrada para atualização de status", id)
	}

	return nil
}

// Delete remove uma pesquisa do banco de dados ou arquiva se houver respostas
// Verifica dependências antes da deleção
func (r *PesquisaRepository) Delete(ctx context.Context, id int) error {
	var count int
	checkQuery := `
        SELECT COUNT(*) 
        FROM resposta r
        INNER JOIN pergunta p ON r.id_pergunta = p.id_pergunta
        WHERE p.id_pesquisa = $1
    `
	err := r.db.QueryRowContext(ctx, checkQuery, id).Scan(&count)
	if err != nil {
		r.logger.Error("erro ao verificar dependências pesquisa ID=%d: %v", id, err)
		return fmt.Errorf("erro ao verificar dependências: %v", err)
	}

	if count > 0 {
		return r.UpdateStatus(ctx, id, "Arquivada")
	}

	query := `DELETE FROM pesquisa WHERE id_pesquisa = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		r.logger.Error("erro ao deletar pesquisa ID=%d: %v", id, err)
		return fmt.Errorf("erro ao deletar pesquisa: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("erro ao verificar linhas afetadas: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("pesquisa com ID %d não encontrada para deleção", id)
	}

	return nil
}
