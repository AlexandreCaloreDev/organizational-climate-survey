// Package usecase implementa os casos de uso para SubmissaoPesquisa.
// Fornece funcionalidades de geração de tokens e controle de submissões anônimas.
package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/domain/repository"
	"organizational-climate-survey/backend/pkg/crypto"

	"github.com/google/uuid"
)

// SubmissaoPesquisaUseCase implementa casos de uso para gerenciamento de submissões anônimas
type SubmissaoPesquisaUseCase struct {
	repo         repository.SubmissaoPesquisaRepository // Repositório de submissões
	pesquisaRepo repository.PesquisaRepository          // Repositório de pesquisas
	crypto       crypto.CryptoService                   // Serviço de criptografia
	hashSalt     string                                 // Salt para hashes de IP/fingerprint
	tokenTTL     time.Duration                          // Tempo de vida do token (padrão: 1h)
	rateLimitMax int                                    // Máximo de tokens por IP/hora (padrão: 3)
}

// NewSubmissaoPesquisaUseCase cria nova instância do caso de uso
func NewSubmissaoPesquisaUseCase(
	repo repository.SubmissaoPesquisaRepository,
	pesquisaRepo repository.PesquisaRepository,
	cryptoService crypto.CryptoService,
	hashSalt string,
) *SubmissaoPesquisaUseCase {
	return &SubmissaoPesquisaUseCase{
		repo:         repo,
		pesquisaRepo: pesquisaRepo,
		crypto:       cryptoService,
		hashSalt:     hashSalt,
		tokenTTL:     1 * time.Hour,
		rateLimitMax: 3,
	}
}

// GenerateAccessToken gera token único para submissão anônima de pesquisa
func (uc *SubmissaoPesquisaUseCase) GenerateAccessToken(
	ctx context.Context,
	pesquisaID int,
	clientIP string,
	fingerprint string,
) (string, time.Time, error) {
	return uc.GenerateAccessTokenWithMetadata(ctx, pesquisaID, clientIP, fingerprint, "", "", false)
}

// GenerateAccessTokenWithMetadata gera token com sinais adicionais para heurística antifraude.
func (uc *SubmissaoPesquisaUseCase) GenerateAccessTokenWithMetadata(
	ctx context.Context,
	pesquisaID int,
	clientIP string,
	fingerprint string,
	userAgent string,
	acceptLanguage string,
	isKiosk bool,
) (string, time.Time, error) {
	// Validar ID da pesquisa
	if pesquisaID <= 0 {
		return "", time.Time{}, fmt.Errorf("ID da pesquisa inválido")
	}

	// Buscar e validar pesquisa
	pesquisa, err := uc.pesquisaRepo.GetByID(ctx, pesquisaID)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("pesquisa não encontrada: %v", err)
	}

	// Validar status da pesquisa
	if pesquisa.Status != "Ativa" {
		return "", time.Time{}, fmt.Errorf("pesquisa não está ativa para receber respostas")
	}

	// Validar período de abertura/fechamento
	now := time.Now()

	if pesquisa.DataAbertura != nil && now.Before(*pesquisa.DataAbertura) {
		return "", time.Time{}, fmt.Errorf("pesquisa ainda não iniciou. Abertura em: %s", pesquisa.DataAbertura.Format("02/01/2006 15:04"))
	}

	if pesquisa.DataFechamento != nil && now.After(*pesquisa.DataFechamento) {
		return "", time.Time{}, fmt.Errorf("período de respostas encerrado em: %s", pesquisa.DataFechamento.Format("02/01/2006 15:04"))
	}

	// Gerar hash do IP para rate limiting (não identificação)
	ipHash := uc.hashIP(clientIP)
	userAgentHash := uc.hashSignal(userAgent)
	acceptLanguageHash := uc.hashSignal(acceptLanguage)

	// Validar rate limit: máximo N tokens por IP na última hora
	lastHour := now.Add(-1 * time.Hour)
	count, err := uc.repo.CountByPesquisaAndIPHash(ctx, pesquisaID, ipHash, lastHour)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("erro ao verificar rate limit: %v", err)
	}

	limitMax := uc.rateLimitMax
	if isKiosk {
		limitMax = 500 // Limite relaxado para Totem/Kiosk corporativo
	}

	if count >= limitMax {
		return "", time.Time{}, fmt.Errorf("limite de tentativas excedido. Tente novamente em 1 hora")
	}

	// Validar duplicidade por fingerprint se não for Kiosk/Totem
	var fingerprintHash string
	if fingerprint != "" {
		fingerprintHash = uc.hashFingerprint(fingerprint)
	}

	if !isKiosk && fingerprintHash != "" {
		duplicateCount, err := uc.repo.CountByPesquisaAndFingerprintHash(ctx, pesquisaID, fingerprintHash, now.Add(-24*time.Hour))
		if err != nil {
			return "", time.Time{}, fmt.Errorf("erro ao verificar duplicidade: %v", err)
		}
		if duplicateCount > 0 {
			return "", time.Time{}, fmt.Errorf("Você já respondeu esta pesquisa.")
		}
	}

	// Gerar token criptograficamente seguro usando CryptoService
	token, err := uc.generateSecureToken(pesquisaID)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("erro ao gerar token: %v", err)
	}

	fingerprintComposto := uc.hashFingerprint(fmt.Sprintf("%s|%s|%s|%s", ipHash, userAgentHash, acceptLanguageHash, fingerprintHash))

	// Calcular expiração
	expiresAt := now.Add(uc.tokenTTL)

	// Criar submissão
	submissao := &entity.SubmissaoPesquisa{
		IDPesquisa:      pesquisaID,
		TokenAcesso:     token,
		IPHash:          ipHash,
		FingerprintHash: fingerprintHash,
		UserAgentHash:   userAgentHash,
		AcceptLangHash:  acceptLanguageHash,
		FingerprintComp: fingerprintComposto,
		Status:          "pendente",
		DataCriacao:     now,
		DataExpiracao:   expiresAt,
	}

	if err := uc.repo.Create(ctx, submissao); err != nil {
		return "", time.Time{}, fmt.Errorf("erro ao criar submissão: %v", err)
	}

	return token, expiresAt, nil
}

// ValidateToken valida token de acesso e retorna submissão
// CRÍTICO: Valida existência, status pendente e não expiração
func (uc *SubmissaoPesquisaUseCase) ValidateToken(ctx context.Context, token string) (*entity.SubmissaoPesquisa, error) {
	if token == "" {
		return nil, fmt.Errorf("token não fornecido")
	}

	// GetByToken já valida: existe, status=pendente, não expirou
	submissao, err := uc.repo.GetByToken(ctx, token)
	if err != nil {
		return nil, err // Mensagem já vem do repository
	}

	// Validação adicional: verificar se pesquisa ainda está ativa
	pesquisa, err := uc.pesquisaRepo.GetByID(ctx, submissao.IDPesquisa)
	if err != nil {
		return nil, fmt.Errorf("pesquisa não encontrada: %v", err)
	}

	if pesquisa.Status != "Ativa" {
		return nil, fmt.Errorf("pesquisa não está mais ativa")
	}

	// Validar período (pesquisa pode ter sido fechada após token ser gerado)
	now := time.Now()
	if pesquisa.DataFechamento != nil && now.After(*pesquisa.DataFechamento) {
		return nil, fmt.Errorf("período de respostas encerrado")
	}

	return submissao, nil
}

// CompleteSubmission marca submissão como completa após respostas serem salvas
func (uc *SubmissaoPesquisaUseCase) CompleteSubmission(ctx context.Context, submissaoID int) error {
	if submissaoID <= 0 {
		return fmt.Errorf("ID da submissão inválido")
	}

	// MarkAsCompleted atualiza status e data_conclusao atomicamente
	if err := uc.repo.MarkAsCompleted(ctx, submissaoID); err != nil {
		return fmt.Errorf("erro ao completar submissão: %v", err)
	}

	return nil
}

// CleanupExpired remove submissões expiradas (job cron)
// Retorna quantidade de submissões removidas
func (uc *SubmissaoPesquisaUseCase) CleanupExpired(ctx context.Context) (int, error) {
	count, err := uc.repo.DeleteExpired(ctx)
	if err != nil {
		return 0, fmt.Errorf("erro ao limpar submissões expiradas: %v", err)
	}

	return count, nil
}

// GetSubmissionStats retorna estatísticas de uma pesquisa
func (uc *SubmissaoPesquisaUseCase) GetSubmissionStats(ctx context.Context, pesquisaID int) (map[string]interface{}, error) {
	if pesquisaID <= 0 {
		return nil, fmt.Errorf("ID da pesquisa inválido")
	}

	// Verificar se pesquisa existe
	_, err := uc.pesquisaRepo.GetByID(ctx, pesquisaID)
	if err != nil {
		return nil, fmt.Errorf("pesquisa não encontrada: %v", err)
	}

	// Contar submissões completas
	completas, err := uc.repo.CountCompleteByPesquisa(ctx, pesquisaID)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar submissões: %v", err)
	}

	// Listar todas submissões para estatísticas adicionais
	submissoes, err := uc.repo.ListByPesquisa(ctx, pesquisaID)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar submissões: %v", err)
	}

	pendentes := 0
	expiradas := 0
	for _, s := range submissoes {
		switch s.Status {
		case "pendente":
			if time.Now().After(s.DataExpiracao) {
				expiradas++
			} else {
				pendentes++
			}
		}
	}

	stats := map[string]interface{}{
		"total_submissoes":     len(submissoes),
		"completas":            completas,
		"pendentes":            pendentes,
		"expiradas":            expiradas,
		"taxa_conclusao":       calculateCompletionRate(completas, len(submissoes)),
		"participantes_unicos": completas, // Cada submissão completa = 1 respondente
	}

	return stats, nil
}

// AnonymizePersonalData remove dados pessoais rastreáveis de uma submissão específica.
func (uc *SubmissaoPesquisaUseCase) AnonymizePersonalData(ctx context.Context, submissaoID int) error {
	if submissaoID <= 0 {
		return fmt.Errorf("ID da submissão inválido")
	}

	anonymizedToken := "anon-" + uuid.NewString()
	if err := uc.repo.AnonymizePersonalData(ctx, submissaoID, anonymizedToken); err != nil {
		return fmt.Errorf("erro ao anonimizar dados pessoais da submissão: %v", err)
	}

	return nil
}

// generateSecureToken gera token criptograficamente seguro
// Formato: UUID base + token aleatório de 32 bytes do CryptoService
func (uc *SubmissaoPesquisaUseCase) generateSecureToken(pesquisaID int) (string, error) {
	// Gerar UUID base
	baseUUID := uuid.New().String()

	// Gerar token aleatório seguro usando CryptoService (32 bytes = 43 chars base64)
	randomToken, err := uc.crypto.GenerateToken(32)
	if err != nil {
		return "", fmt.Errorf("erro ao gerar token aleatório: %v", err)
	}

	// Token final: UUID (36 chars) + token aleatório (43 chars) = ~79 chars
	// Suficientemente único e seguro contra brute force
	token := baseUUID + randomToken

	return token, nil
}

// hashIP gera hash SHA256 do IP com salt
// Usado para rate limiting sem identificar usuário
func (uc *SubmissaoPesquisaUseCase) hashIP(ip string) string {
	hasher := sha256.New()
	hasher.Write([]byte(ip + uc.hashSalt))
	return hex.EncodeToString(hasher.Sum(nil))
}

// hashFingerprint gera hash SHA256 do fingerprint do browser
func (uc *SubmissaoPesquisaUseCase) hashFingerprint(fingerprint string) string {
	if fingerprint == "" {
		return ""
	}
	hasher := sha256.New()
	hasher.Write([]byte(fingerprint + uc.hashSalt))
	return hex.EncodeToString(hasher.Sum(nil))
}

func (uc *SubmissaoPesquisaUseCase) hashSignal(value string) string {
	if value == "" {
		return ""
	}
	hasher := sha256.New()
	hasher.Write([]byte(value + uc.hashSalt))
	return hex.EncodeToString(hasher.Sum(nil))
}

// calculateCompletionRate calcula taxa de conclusão em porcentagem
func calculateCompletionRate(completas, total int) float64 {
	if total == 0 {
		return 0.0
	}
	return (float64(completas) / float64(total)) * 100.0
}

// SetTokenTTL permite configurar tempo de vida do token (para testes)
func (uc *SubmissaoPesquisaUseCase) SetTokenTTL(ttl time.Duration) {
	uc.tokenTTL = ttl
}

// SetRateLimit permite configurar limite de requisições (para testes)
func (uc *SubmissaoPesquisaUseCase) SetRateLimit(max int) {
	uc.rateLimitMax = max
}
