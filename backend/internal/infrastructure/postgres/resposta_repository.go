// Package postgres implementa o repositório de Resposta usando PostgreSQL.
// Fornece operações para gerenciamento e análise de respostas das pesquisas.
package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/domain/repository"
	"organizational-climate-survey/backend/pkg/logger"
)

// RespostaRepository implementa a interface repository.RespostaRepository
type RespostaRepository struct {
	db     *DB           // Conexão com o banco de dados
	logger logger.Logger // Logger para operações do repositório
}

// NewRespostaRepository cria uma nova instância do repositório
func NewRespostaRepository(db *DB) *RespostaRepository {
	return &RespostaRepository{
		db:     db,
		logger: db.logger,
	}
}

var _ repository.RespostaRepository = (*RespostaRepository)(nil)

// CreateBatch insere múltiplas respostas em uma única transação
// CRÍTICO: Todas as respostas DEVEM ter IDSubmissao preenchido
func (r *RespostaRepository) CreateBatch(ctx context.Context, respostas []*entity.Resposta) error {
	if len(respostas) == 0 {
		return nil
	}

	// Validação crítica: IDSubmissao obrigatório
	for i, resposta := range respostas {
		if resposta.IDSubmissao == 0 {
			return fmt.Errorf("resposta %d: id_submissao é obrigatório", i+1)
		}
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		r.logger.Error("erro ao iniciar transação batch respostas: %v", err)
		return fmt.Errorf("erro ao iniciar transação: %v", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
        INSERT INTO resposta (id_pergunta, id_submissao, valor_resposta, data_submissao)
        VALUES ($1, $2, $3, NOW())
        RETURNING id_resposta
    `)
	if err != nil {
		r.logger.Error("erro ao preparar statement batch respostas: %v", err)
		return fmt.Errorf("erro ao preparar statement: %v", err)
	}
	defer stmt.Close()

	for _, resposta := range respostas {
		err := stmt.QueryRowContext(ctx,
			resposta.IDPergunta,
			resposta.IDSubmissao, // NOVO: vincula à submissão anônima
			resposta.ValorResposta,
		).Scan(&resposta.ID)

		if err != nil {
			r.logger.Error("erro ao inserir resposta batch: %v", err)
			return fmt.Errorf("erro ao inserir resposta: %v", err)
		}
	}

	if err := tx.Commit(); err != nil {
		r.logger.Error("erro ao commit batch respostas: %v", err)
		return fmt.Errorf("erro ao commit: %v", err)
	}

	r.logger.Info("batch de %d respostas criado com sucesso", len(respostas))
	return nil
}

// GetByID busca uma resposta específica pelo identificador
func (r *RespostaRepository) GetByID(ctx context.Context, id int) (*entity.Resposta, error) {
	query := `
		SELECT 
			r.id_resposta,
			r.id_pergunta,
			r.id_submissao,
			r.valor_resposta,
			r.data_submissao
		FROM resposta r
		WHERE r.id_resposta = $1
	`

	resposta := &entity.Resposta{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&resposta.ID,
		&resposta.IDPergunta,
		&resposta.IDSubmissao,
		&resposta.ValorResposta,
		&resposta.DataSubmissao,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("resposta não encontrada")
	}

	if err != nil {
		r.logger.Error("erro ao buscar resposta ID=%d: %v", id, err)
		return nil, fmt.Errorf("erro ao buscar resposta: %v", err)
	}

	return resposta, nil
}

// CountByPesquisa conta o total de respondentes únicos (participantes) de uma pesquisa
func (r *RespostaRepository) CountByPesquisa(ctx context.Context, pesquisaID int) (int, error) {
	var count int
	query := `
		SELECT COUNT(DISTINCT r.id_submissao) 
		FROM resposta r
		INNER JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		WHERE p.id_pesquisa = $1
	`

	err := r.db.QueryRowContext(ctx, query, pesquisaID).Scan(&count)
	if err != nil {
		r.logger.Error("erro ao contar respostas pesquisa ID=%d: %v", pesquisaID, err)
		return 0, fmt.Errorf("erro ao contar respostas da pesquisa: %v", err)
	}

	return count, nil
}

// CountByPergunta conta o total de respostas para uma pergunta específica
func (r *RespostaRepository) CountByPergunta(ctx context.Context, perguntaID int) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM resposta WHERE id_pergunta = $1`

	err := r.db.QueryRowContext(ctx, query, perguntaID).Scan(&count)
	if err != nil {
		r.logger.Error("erro ao contar respostas pergunta ID=%d: %v", perguntaID, err)
		return 0, fmt.Errorf("erro ao contar respostas da pergunta: %v", err)
	}

	return count, nil
}

// CountBySubmissao conta total de respostas de uma submissão
// Útil para validar se todas as perguntas foram respondidas
func (r *RespostaRepository) CountBySubmissao(ctx context.Context, submissaoID int) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM resposta WHERE id_submissao = $1`

	err := r.db.QueryRowContext(ctx, query, submissaoID).Scan(&count)
	if err != nil {
		r.logger.Error("erro ao contar respostas submissao ID=%d: %v", submissaoID, err)
		return 0, fmt.Errorf("erro ao contar respostas da submissão: %v", err)
	}

	return count, nil
}

// GetAggregatedByPergunta retorna contagem agrupada de respostas por valor
// Útil para análises e dashboards
func (r *RespostaRepository) GetAggregatedByPergunta(ctx context.Context, perguntaID int) (map[string]int, error) {
	query := `
        SELECT valor_resposta, COUNT(*) as quantidade
        FROM resposta 
        WHERE id_pergunta = $1 
        GROUP BY valor_resposta
        ORDER BY quantidade DESC
    `

	rows, err := r.db.QueryContext(ctx, query, perguntaID)
	if err != nil {
		r.logger.Error("erro ao buscar agregados pergunta ID=%d: %v", perguntaID, err)
		return nil, fmt.Errorf("erro ao buscar dados agregados: %v", err)
	}
	defer rows.Close()

	result := make(map[string]int)

	for rows.Next() {
		var valor string
		var quantidade int

		err := rows.Scan(&valor, &quantidade)
		if err != nil {
			r.logger.Error("erro ao escanear agregado: %v", err)
			return nil, fmt.Errorf("erro ao escanear resultado: %v", err)
		}

		result[valor] = quantidade
	}

	if err := rows.Err(); err != nil {
		r.logger.Error("erro ao iterar agregados: %v", err)
		return nil, fmt.Errorf("erro durante iteração: %v", err)
	}

	return result, nil
}

// GetAggregatedByPesquisa retorna contagem agrupada de todas as respostas da pesquisa
// Agrupadas por pergunta e valor da resposta
func (r *RespostaRepository) GetAggregatedByPesquisa(ctx context.Context, pesquisaID int) (map[int]map[string]int, error) {
	query := `
        SELECT r.id_pergunta, r.valor_resposta, COUNT(*) as quantidade
        FROM resposta r
        INNER JOIN pergunta p ON r.id_pergunta = p.id_pergunta
        WHERE p.id_pesquisa = $1 
        GROUP BY r.id_pergunta, r.valor_resposta
        ORDER BY r.id_pergunta, quantidade DESC
    `

	rows, err := r.db.QueryContext(ctx, query, pesquisaID)
	if err != nil {
		r.logger.Error("erro ao buscar agregados pesquisa ID=%d: %v", pesquisaID, err)
		return nil, fmt.Errorf("erro ao buscar dados agregados por pesquisa: %v", err)
	}
	defer rows.Close()

	result := make(map[int]map[string]int)

	for rows.Next() {
		var perguntaID int
		var valor string
		var quantidade int

		err := rows.Scan(&perguntaID, &valor, &quantidade)
		if err != nil {
			r.logger.Error("erro ao escanear agregado pesquisa: %v", err)
			return nil, fmt.Errorf("erro ao escanear resultado: %v", err)
		}

		if result[perguntaID] == nil {
			result[perguntaID] = make(map[string]int)
		}

		result[perguntaID][valor] = quantidade
	}

	if err := rows.Err(); err != nil {
		r.logger.Error("erro ao iterar agregados pesquisa: %v", err)
		return nil, fmt.Errorf("erro durante iteração: %v", err)
	}

	return result, nil
}

// GetResponsesByDateRange busca respostas dentro de um intervalo de datas
func (r *RespostaRepository) GetResponsesByDateRange(ctx context.Context, pesquisaID int, startDate, endDate string) ([]*entity.Resposta, error) {
	query := `
        SELECT r.id_resposta, r.id_pergunta, r.id_submissao, r.valor_resposta, r.data_submissao
        FROM resposta r
        INNER JOIN pergunta p ON r.id_pergunta = p.id_pergunta
        WHERE p.id_pesquisa = $1 
          AND r.data_submissao BETWEEN $2 AND $3
        ORDER BY r.data_submissao
    `

	rows, err := r.db.QueryContext(ctx, query, pesquisaID, startDate, endDate)
	if err != nil {
		r.logger.Error("erro ao buscar respostas por período pesquisa ID=%d: %v", pesquisaID, err)
		return nil, fmt.Errorf("erro ao buscar respostas por período: %v", err)
	}
	defer rows.Close()

	var respostas []*entity.Resposta

	for rows.Next() {
		resposta := &entity.Resposta{}
		err := rows.Scan(
			&resposta.ID,
			&resposta.IDPergunta,
			&resposta.IDSubmissao, // INCLUÍDO
			&resposta.ValorResposta,
			&resposta.DataSubmissao,
		)
		if err != nil {
			r.logger.Error("erro ao escanear resposta: %v", err)
			return nil, fmt.Errorf("erro ao escanear resposta: %v", err)
		}

		respostas = append(respostas, resposta)
	}

	if err := rows.Err(); err != nil {
		r.logger.Error("erro ao iterar respostas: %v", err)
		return nil, fmt.Errorf("erro durante iteração: %v", err)
	}

	return respostas, nil
}

// GetBySubmissao busca todas as respostas de uma submissão específica
// Mantém vínculo entre respostas do mesmo respondente anônimo
func (r *RespostaRepository) GetBySubmissao(ctx context.Context, submissaoID int) ([]*entity.Resposta, error) {
	query := `
		SELECT 
			r.id_resposta,
			r.id_pergunta,
			r.id_submissao,
			r.valor_resposta,
			r.data_submissao
		FROM resposta r
		WHERE r.id_submissao = $1
		ORDER BY r.id_pergunta
	`

	rows, err := r.db.QueryContext(ctx, query, submissaoID)
	if err != nil {
		r.logger.Error("erro ao buscar respostas submissao ID=%d: %v", submissaoID, err)
		return nil, fmt.Errorf("erro ao buscar respostas da submissão: %v", err)
	}
	defer rows.Close()

	var respostas []*entity.Resposta

	for rows.Next() {
		resposta := &entity.Resposta{}
		err := rows.Scan(
			&resposta.ID,
			&resposta.IDPergunta,
			&resposta.IDSubmissao,
			&resposta.ValorResposta,
			&resposta.DataSubmissao,
		)
		if err != nil {
			r.logger.Error("erro ao escanear resposta: %v", err)
			return nil, fmt.Errorf("erro ao escanear resposta: %v", err)
		}

		respostas = append(respostas, resposta)
	}

	if err := rows.Err(); err != nil {
		r.logger.Error("erro ao iterar respostas: %v", err)
		return nil, fmt.Errorf("erro durante iteração: %v", err)
	}

	return respostas, nil
}

// ListByPesquisa retorna todas as respostas de uma pesquisa
// ATENÇÃO: Não expor em endpoints públicos - apenas para admin/análises
func (r *RespostaRepository) ListByPesquisa(ctx context.Context, pesquisaID int) ([]*entity.Resposta, error) {
	query := `
		SELECT 
			r.id_resposta,
			r.id_pergunta,
			r.id_submissao,
			r.valor_resposta,
			r.data_submissao
		FROM resposta r
		INNER JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		WHERE p.id_pesquisa = $1
		ORDER BY r.id_submissao, r.id_pergunta
	`

	rows, err := r.db.QueryContext(ctx, query, pesquisaID)
	if err != nil {
		r.logger.Error("erro ao listar respostas pesquisa ID=%d: %v", pesquisaID, err)
		return nil, fmt.Errorf("erro ao listar respostas: %v", err)
	}
	defer rows.Close()

	var respostas []*entity.Resposta

	for rows.Next() {
		resposta := &entity.Resposta{}
		err := rows.Scan(
			&resposta.ID,
			&resposta.IDPergunta,
			&resposta.IDSubmissao,
			&resposta.ValorResposta,
			&resposta.DataSubmissao,
		)
		if err != nil {
			r.logger.Error("erro ao escanear resposta: %v", err)
			return nil, fmt.Errorf("erro ao escanear resposta: %v", err)
		}

		respostas = append(respostas, resposta)
	}

	if err := rows.Err(); err != nil {
		r.logger.Error("erro ao iterar respostas: %v", err)
		return nil, fmt.Errorf("erro durante iteração: %v", err)
	}

	return respostas, nil
}

// DeleteByPesquisa remove todas as respostas de uma pesquisa
// CASCADE remove submissões e respostas automaticamente
func (r *RespostaRepository) DeleteByPesquisa(ctx context.Context, pesquisaID int) error {
	query := `
		DELETE FROM resposta 
		WHERE id_pergunta IN (
			SELECT id_pergunta FROM pergunta WHERE id_pesquisa = $1
		)
	`

	result, err := r.db.ExecContext(ctx, query, pesquisaID)
	if err != nil {
		r.logger.Error("erro ao deletar respostas pesquisa ID=%d: %v", pesquisaID, err)
		return fmt.Errorf("erro ao deletar respostas: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("erro ao verificar linhas afetadas: %v", err)
	}

	r.logger.Info("respostas deletadas pesquisa ID=%d count=%d", pesquisaID, rowsAffected)
	return nil
}

// DeleteBySubmissao remove todas as respostas de uma submissão específica
// Útil para retração de dados ou correção de submissões corrompidas
func (r *RespostaRepository) DeleteBySubmissao(ctx context.Context, submissaoID int) error {
	query := `DELETE FROM resposta WHERE id_submissao = $1`

	result, err := r.db.ExecContext(ctx, query, submissaoID)
	if err != nil {
		r.logger.Error("erro ao deletar respostas submissao ID=%d: %v", submissaoID, err)
		return fmt.Errorf("erro ao deletar respostas da submissão: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("erro ao verificar linhas afetadas: %v", err)
	}

	r.logger.Info("respostas deletadas submissao ID=%d count=%d", submissaoID, rowsAffected)
	return nil
}