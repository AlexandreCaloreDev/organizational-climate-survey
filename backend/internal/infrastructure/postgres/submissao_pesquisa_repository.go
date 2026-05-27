// Package postgres implementa repositórios de acesso a dados usando PostgreSQL.
// Fornece persistência para submissões de pesquisas anônimas.
package postgres

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"organizational-climate-survey/backend/internal/domain/entity"
)

// SubmissaoPesquisaRepository implementa persistência de submissões no PostgreSQL
type SubmissaoPesquisaRepository struct {
	db *DB
}

// NewSubmissaoPesquisaRepository cria nova instância do repositório
func NewSubmissaoPesquisaRepository(db *DB) *SubmissaoPesquisaRepository {
	return &SubmissaoPesquisaRepository{
		db: db, // Agora recebe *DB completo
	}
}

// Create insere nova submissão no banco
func (r *SubmissaoPesquisaRepository) Create(ctx context.Context, submissao *entity.SubmissaoPesquisa) error {
	query := `
		INSERT INTO submissao_pesquisa (
			id_pesquisa,
			token_acesso,
			ip_hash,
			fingerprint_hash,
			user_agent_hash,
			accept_language_hash,
			fingerprint_composto,
			status,
			data_criacao,
			data_expiracao
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id_submissao
	`

	err := r.db.QueryRowContext(
		ctx,
		query,
		submissao.IDPesquisa,
		submissao.TokenAcesso,
		submissao.IPHash,
		submissao.FingerprintHash,
		submissao.UserAgentHash,
		submissao.AcceptLangHash,
		submissao.FingerprintComp,
		submissao.Status,
		submissao.DataCriacao,
		submissao.DataExpiracao,
	).Scan(&submissao.ID)

	if err != nil {
		return fmt.Errorf("erro ao criar submissão: %w", err)
	}

	return nil
}

// GetByToken busca submissão por token de acesso
// CRÍTICO: Valida que token existe, não expirou e está pendente
func (r *SubmissaoPesquisaRepository) GetByToken(ctx context.Context, token string) (*entity.SubmissaoPesquisa, error) {
	query := `
		SELECT 
			id_submissao,
			id_pesquisa,
			token_acesso,
			ip_hash,
			fingerprint_hash,
			user_agent_hash,
			accept_language_hash,
			fingerprint_composto,
			status,
			data_criacao,
			data_expiracao,
			data_conclusao
		FROM submissao_pesquisa
		WHERE token_acesso = $1
		AND status = 'pendente'
		AND data_expiracao > NOW()
	`

	submissao := &entity.SubmissaoPesquisa{}
	var dataConclusao sql.NullTime

	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&submissao.ID,
		&submissao.IDPesquisa,
		&submissao.TokenAcesso,
		&submissao.IPHash,
		&submissao.FingerprintHash,
		&submissao.UserAgentHash,
		&submissao.AcceptLangHash,
		&submissao.FingerprintComp,
		&submissao.Status,
		&submissao.DataCriacao,
		&submissao.DataExpiracao,
		&dataConclusao,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("token inválido, expirado ou já utilizado")
	}

	if err != nil {
		return nil, fmt.Errorf("erro ao buscar submissão: %w", err)
	}

	if dataConclusao.Valid {
		submissao.DataConclusao = &dataConclusao.Time
	}

	return submissao, nil
}

// GetByID busca submissão por identificador
func (r *SubmissaoPesquisaRepository) GetByID(ctx context.Context, id int) (*entity.SubmissaoPesquisa, error) {
	query := `
		SELECT 
			id_submissao,
			id_pesquisa,
			token_acesso,
			ip_hash,
			fingerprint_hash,
			user_agent_hash,
			accept_language_hash,
			fingerprint_composto,
			status,
			data_criacao,
			data_expiracao,
			data_conclusao
		FROM submissao_pesquisa
		WHERE id_submissao = $1
	`

	submissao := &entity.SubmissaoPesquisa{}
	var dataConclusao sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&submissao.ID,
		&submissao.IDPesquisa,
		&submissao.TokenAcesso,
		&submissao.IPHash,
		&submissao.FingerprintHash,
		&submissao.UserAgentHash,
		&submissao.AcceptLangHash,
		&submissao.FingerprintComp,
		&submissao.Status,
		&submissao.DataCriacao,
		&submissao.DataExpiracao,
		&dataConclusao,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("submissão não encontrada")
	}

	if err != nil {
		return nil, fmt.Errorf("erro ao buscar submissão: %w", err)
	}

	if dataConclusao.Valid {
		submissao.DataConclusao = &dataConclusao.Time
	}

	return submissao, nil
}

// UpdateStatus atualiza status da submissão
func (r *SubmissaoPesquisaRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	query := `
		UPDATE submissao_pesquisa
		SET status = $1
		WHERE id_submissao = $2
	`

	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("erro ao atualizar status: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("erro ao verificar linhas afetadas: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("submissão não encontrada")
	}

	return nil
}

// MarkAsCompleted marca submissão como completa com timestamp
func (r *SubmissaoPesquisaRepository) MarkAsCompleted(ctx context.Context, id int) error {
	query := `
		UPDATE submissao_pesquisa
		SET 
			status = 'completa',
			data_conclusao = NOW()
		WHERE id_submissao = $1
		AND status = 'pendente'
	`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("erro ao marcar submissão como completa: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("erro ao verificar linhas afetadas: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("submissão não encontrada ou já finalizada")
	}

	return nil
}

// CountByPesquisaAndIPHash conta submissões de um IP em período específico
// Anti-spam: limitar tokens por IP por hora
func (r *SubmissaoPesquisaRepository) CountByPesquisaAndIPHash(ctx context.Context, pesquisaID int, ipHash string, since time.Time) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM submissao_pesquisa
		WHERE id_pesquisa = $1
		AND ip_hash = $2
		AND data_criacao >= $3
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, pesquisaID, ipHash, since).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("erro ao contar submissões por IP: %w", err)
	}

	return count, nil
}

// CountByPesquisaAndSignals conta submissões com 2 de 3 sinais coincidentes (IP, User-Agent, Accept-Language).
func (r *SubmissaoPesquisaRepository) CountByPesquisaAndSignals(
	ctx context.Context,
	pesquisaID int,
	ipHash, userAgentHash, acceptLanguageHash string,
	since time.Time,
) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM submissao_pesquisa
		WHERE id_pesquisa = $1
		AND data_criacao >= $5
		AND (
			(CASE WHEN ip_hash = $2 THEN 1 ELSE 0 END) +
			(CASE WHEN $3 <> '' AND user_agent_hash = $3 THEN 1 ELSE 0 END) +
			(CASE WHEN $4 <> '' AND accept_language_hash = $4 THEN 1 ELSE 0 END)
		) >= 2
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, pesquisaID, ipHash, userAgentHash, acceptLanguageHash, since).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("erro ao contar submissões por sinais: %w", err)
	}

	return count, nil
}

// CountByPesquisaAndFingerprintHash conta submissões completadas com o mesmo fingerprint
func (r *SubmissaoPesquisaRepository) CountByPesquisaAndFingerprintHash(
	ctx context.Context,
	pesquisaID int,
	fingerprintHash string,
	since time.Time,
) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM submissao_pesquisa
		WHERE id_pesquisa = $1
		AND fingerprint_hash = $2
		AND status = 'completa'
		AND data_criacao >= $3
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, pesquisaID, fingerprintHash, since).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("erro ao contar submissões por fingerprint: %w", err)
	}

	return count, nil
}

// DeleteExpired remove submissões expiradas
// Job cron executa periodicamente para limpeza
func (r *SubmissaoPesquisaRepository) DeleteExpired(ctx context.Context) (int, error) {
	query := `
		DELETE FROM submissao_pesquisa
		WHERE status = 'pendente'
		AND data_expiracao < NOW()
	`

	result, err := r.db.ExecContext(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("erro ao deletar submissões expiradas: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("erro ao verificar linhas deletadas: %w", err)
	}

	return int(rows), nil
}

// ListByPesquisa lista todas as submissões de uma pesquisa
// Útil para dashboards administrativos (contagem de participantes)
func (r *SubmissaoPesquisaRepository) ListByPesquisa(ctx context.Context, pesquisaID int) ([]*entity.SubmissaoPesquisa, error) {
	query := `
		SELECT 
			id_submissao,
			id_pesquisa,
			token_acesso,
			ip_hash,
			fingerprint_hash,
			user_agent_hash,
			accept_language_hash,
			fingerprint_composto,
			status,
			data_criacao,
			data_expiracao,
			data_conclusao
		FROM submissao_pesquisa
		WHERE id_pesquisa = $1
		ORDER BY data_criacao DESC
	`

	rows, err := r.db.QueryContext(ctx, query, pesquisaID)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar submissões: %w", err)
	}
	defer rows.Close()

	submissoes := []*entity.SubmissaoPesquisa{}

	for rows.Next() {
		submissao := &entity.SubmissaoPesquisa{}
		var dataConclusao sql.NullTime

		err := rows.Scan(
			&submissao.ID,
			&submissao.IDPesquisa,
			&submissao.TokenAcesso,
			&submissao.IPHash,
			&submissao.FingerprintHash,
			&submissao.UserAgentHash,
			&submissao.AcceptLangHash,
			&submissao.FingerprintComp,
			&submissao.Status,
			&submissao.DataCriacao,
			&submissao.DataExpiracao,
			&dataConclusao,
		)

		if err != nil {
			return nil, fmt.Errorf("erro ao escanear submissão: %w", err)
		}

		if dataConclusao.Valid {
			submissao.DataConclusao = &dataConclusao.Time
		}

		submissoes = append(submissoes, submissao)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("erro ao iterar submissões: %w", err)
	}

	return submissoes, nil
}

// CountCompleteByPesquisa conta submissões completas de uma pesquisa
// Métrica: quantas pessoas finalizaram a pesquisa
func (r *SubmissaoPesquisaRepository) CountCompleteByPesquisa(ctx context.Context, pesquisaID int) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM submissao_pesquisa
		WHERE id_pesquisa = $1
		AND status = 'completa'
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, pesquisaID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("erro ao contar submissões completas: %w", err)
	}

	return count, nil
}

// AnonymizePersonalData remove dados pessoais rastreáveis de uma submissão.
func (r *SubmissaoPesquisaRepository) AnonymizePersonalData(ctx context.Context, id int, anonymizedToken string) error {
	query := `
		UPDATE submissao_pesquisa
		SET
			token_acesso = $2,
			ip_hash = NULL,
			fingerprint_hash = NULL,
			user_agent_hash = NULL,
			accept_language_hash = NULL,
			fingerprint_composto = NULL
		WHERE id_submissao = $1
	`

	result, err := r.db.ExecContext(ctx, query, id, anonymizedToken)
	if err != nil {
		return fmt.Errorf("erro ao anonimizar submissão: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("erro ao verificar linhas afetadas: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("submissão não encontrada")
	}

	return nil
}

// HashIP gera hash SHA256 de um IP com salt
// Função utilitária para criar ip_hash consistente
func HashIP(ip string, salt string) string {
	hasher := sha256.New()
	hasher.Write([]byte(ip + salt))
	return hex.EncodeToString(hasher.Sum(nil))
}

// HashFingerprint gera hash SHA256 de fingerprint do browser
func HashFingerprint(fingerprint string, salt string) string {
	if fingerprint == "" {
		return ""
	}
	hasher := sha256.New()
	hasher.Write([]byte(fingerprint + salt))
	return hex.EncodeToString(hasher.Sum(nil))
}
