// Package usecase implementa os casos de uso para Pesquisas.
// Fornece funcionalidades de CRUD e gerenciamento do ciclo de vida das pesquisas.
package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/domain/repository"
	"strings"
	"time"
)

// PesquisaUseCase implementa casos de uso para gerenciamento de pesquisas
type PesquisaUseCase struct {
	pesquisaRepo     repository.PesquisaRepository     // Repositório de pesquisas
	empresaRepo      repository.EmpresaRepository      // Repositório de empresas
	setorRepo        repository.SetorRepository        // Repositório de setores
	dashboardRepo    repository.DashboardRepository    // Repositório de dashboards
	logAuditoriaRepo repository.LogAuditoriaRepository // Repositório de logs
}

// NewPesquisaUseCase cria uma nova instância do caso de uso de pesquisas
func NewPesquisaUseCase(
	pesquisaRepo repository.PesquisaRepository,
	empresaRepo repository.EmpresaRepository,
	setorRepo repository.SetorRepository,
	dashboardRepo repository.DashboardRepository,
	logRepo repository.LogAuditoriaRepository,
) *PesquisaUseCase {
	return &PesquisaUseCase{
		pesquisaRepo:     pesquisaRepo,
		empresaRepo:      empresaRepo,
		setorRepo:        setorRepo,
		dashboardRepo:    dashboardRepo,
		logAuditoriaRepo: logRepo,
	}
}

// GenerateUniqueLink gera um link único para a pesquisa
func (uc *PesquisaUseCase) GenerateUniqueLink() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("erro ao gerar link: %v", err)
	}
	return hex.EncodeToString(bytes), nil
}

// ValidatePesquisaDates valida datas da pesquisa
func (uc *PesquisaUseCase) ValidatePesquisaDates(dataAbertura, dataFechamento *time.Time) error {
	if dataAbertura != nil && dataFechamento != nil {
		if dataFechamento.Before(*dataAbertura) {
			return fmt.Errorf("data de fechamento deve ser posterior à data de abertura")
		}

		// Valida se a data de fechamento não é muito distante (ex: máximo 1 ano)
		if dataFechamento.Sub(*dataAbertura) > 365*24*time.Hour {
			return fmt.Errorf("período máximo da pesquisa é de 1 ano")
		}
	}

	return nil
}

// Create cria uma nova pesquisa com validações
func (uc *PesquisaUseCase) Create(ctx context.Context, pesquisa *entity.Pesquisa, userAdminID int, enderecoIP string) error {
	// Validações básicas
	if pesquisa.IDEmpresa <= 0 {
		return fmt.Errorf("ID da empresa é obrigatório")
	}

	if strings.TrimSpace(pesquisa.Titulo) == "" {
		return fmt.Errorf("título da pesquisa é obrigatório")
	}

	// Verifica se empresa existe
	_, err := uc.empresaRepo.GetByID(ctx, pesquisa.IDEmpresa)
	if err != nil {
		return fmt.Errorf("empresa não encontrada: %v", err)
	}

	// Verifica se setor existe (se fornecido)
	if pesquisa.IDSetor > 0 {
		setor, err := uc.setorRepo.GetByID(ctx, pesquisa.IDSetor)
		if err != nil {
			return fmt.Errorf("setor não encontrado: %v", err)
		}
		// Verifica se setor pertence à empresa
		if setor.IDEmpresa != pesquisa.IDEmpresa {
			return fmt.Errorf("setor não pertence à empresa informada")
		}
	}

	// Valida datas
	if err := uc.ValidatePesquisaDates(pesquisa.DataAbertura, pesquisa.DataFechamento); err != nil {
		return err
	}

	// Define valores padrão
	pesquisa.IDUserAdmin = userAdminID
	pesquisa.DataCriacao = time.Now()
	pesquisa.Status = "Rascunho"
	pesquisa.Anonimato = true // Padrão conforme RF01.1

	// Gera link único
	linkUnico, err := uc.GenerateUniqueLink()
	if err != nil {
		return fmt.Errorf("erro ao gerar link: %v", err)
	}
	pesquisa.LinkAcesso = linkUnico

	// Cria a pesquisa
	if err := uc.pesquisaRepo.Create(ctx, pesquisa); err != nil {
		return fmt.Errorf("erro ao criar pesquisa: %v", err)
	}

	// Cria dashboard automático (requisito RF02.3)
	dashboard := &entity.Dashboard{
		IDPesquisa:    pesquisa.ID,
		Titulo:        fmt.Sprintf("Dashboard - %s", pesquisa.Titulo),
		DataCriacao:   time.Now(),
		ConfigFiltros: nil, // Será definido como padrão
	}

	defaultConfig := `{"filtros_padrao": true}`
	dashboard.ConfigFiltros = &defaultConfig

	if err := uc.dashboardRepo.Create(ctx, dashboard); err != nil {
		// Log do erro, mas não falha a criação da pesquisa
		fmt.Printf("Aviso: erro ao criar dashboard para pesquisa %d: %v\n", pesquisa.ID, err)
	}

	// Log de auditoria
	log := &entity.LogAuditoria{
		IDUserAdmin:   userAdminID,
		TimeStamp:     time.Now(),
		AcaoRealizada: "Pesquisa Criada",
		Detalhes:      fmt.Sprintf("Pesquisa criada: %s (ID: %d)", pesquisa.Titulo, pesquisa.ID),
		EnderecoIP:    enderecoIP,
	}
	uc.logAuditoriaRepo.Create(ctx, log)

	return nil
}

// GetByID busca uma pesquisa pelo seu ID
func (uc *PesquisaUseCase) GetByID(ctx context.Context, id int) (*entity.Pesquisa, error) {
	if id <= 0 {
		return nil, fmt.Errorf("ID da pesquisa deve ser maior que zero")
	}

	return uc.pesquisaRepo.GetByID(ctx, id)
}

// GetByLinkAcesso busca uma pesquisa pelo seu link de acesso
func (uc *PesquisaUseCase) GetByLinkAcesso(ctx context.Context, link string) (*entity.Pesquisa, error) {
	if strings.TrimSpace(link) == "" {
		return nil, fmt.Errorf("link de acesso é obrigatório")
	}

	pesquisa, err := uc.pesquisaRepo.GetByLinkAcesso(ctx, link)
	if err != nil {
		return nil, fmt.Errorf("pesquisa não encontrada com este link: %v", err)
	}

	// Verifica se pesquisa está ativa e dentro do período
	if err := uc.ValidateAccess(pesquisa); err != nil {
		return nil, err
	}

	return pesquisa, nil
}

// ValidateAccess verifica se pesquisa pode ser acessada
func (uc *PesquisaUseCase) ValidateAccess(pesquisa *entity.Pesquisa) error {
	now := time.Now()

	if pesquisa.Status != "Ativa" {
		return fmt.Errorf("pesquisa não está ativa")
	}

	if pesquisa.DataAbertura != nil && now.Before(*pesquisa.DataAbertura) {
		return fmt.Errorf("pesquisa ainda não foi aberta")
	}

	if pesquisa.DataFechamento != nil && now.After(*pesquisa.DataFechamento) {
		return fmt.Errorf("pesquisa já foi encerrada")
	}

	return nil
}

// ListByEmpresa lista pesquisas de uma empresa
func (uc *PesquisaUseCase) ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.Pesquisa, error) {
	if empresaID <= 0 {
		return nil, fmt.Errorf("ID da empresa deve ser maior que zero")
	}

	// Verifica se empresa existe
	_, err := uc.empresaRepo.GetByID(ctx, empresaID)
	if err != nil {
		return nil, fmt.Errorf("empresa não encontrada: %v", err)
	}

	return uc.pesquisaRepo.ListByEmpresa(ctx, empresaID)
}

// ListBySetor lista pesquisas de um setor
func (uc *PesquisaUseCase) ListBySetor(ctx context.Context, setorID int) ([]*entity.Pesquisa, error) {
	if setorID <= 0 {
		return nil, fmt.Errorf("ID do setor deve ser maior que zero")
	}

	// Verifica se setor existe
	_, err := uc.setorRepo.GetByID(ctx, setorID)
	if err != nil {
		return nil, fmt.Errorf("setor não encontrado: %v", err)
	}

	return uc.pesquisaRepo.ListBySetor(ctx, setorID)
}

// ListByStatus lista pesquisas por status
func (uc *PesquisaUseCase) ListByStatus(ctx context.Context, empresaID int, status string) ([]*entity.Pesquisa, error) {
	if empresaID <= 0 {
		return nil, fmt.Errorf("ID da empresa deve ser maior que zero")
	}

	// Verifica se empresa existe
	_, err := uc.empresaRepo.GetByID(ctx, empresaID)
	if err != nil {
		return nil, fmt.Errorf("empresa não encontrada: %v", err)
	}

	validStatuses := map[string]bool{
		"Rascunho":  true,
		"Ativa":     true,
		"Concluída": true,
		"Arquivada": true,
	}

	if !validStatuses[status] {
		return nil, fmt.Errorf("status inválido: %s", status)
	}

	return uc.pesquisaRepo.ListByStatus(ctx, empresaID, status)
}

// ListActive lista pesquisas ativas
func (uc *PesquisaUseCase) ListActive(ctx context.Context, empresaID int) ([]*entity.Pesquisa, error) {
	if empresaID <= 0 {
		return nil, fmt.Errorf("ID da empresa deve ser maior que zero")
	}

	// Verifica se empresa existe
	_, err := uc.empresaRepo.GetByID(ctx, empresaID)
	if err != nil {
		return nil, fmt.Errorf("empresa não encontrada: %v", err)
	}

	return uc.pesquisaRepo.ListActive(ctx, empresaID)
}

// Update atualiza uma pesquisa existente
func (uc *PesquisaUseCase) Update(ctx context.Context, pesquisa *entity.Pesquisa, userAdminID int, enderecoIP string) error {
	// Validações
	if pesquisa.ID <= 0 {
		return fmt.Errorf("ID da pesquisa inválido")
	}

	if strings.TrimSpace(pesquisa.Titulo) == "" {
		return fmt.Errorf("título da pesquisa é obrigatório")
	}

	// Busca pesquisa atual
	existing, err := uc.pesquisaRepo.GetByID(ctx, pesquisa.ID)
	if err != nil {
		return fmt.Errorf("pesquisa não encontrada: %v", err)
	}

	// Verifica permissão (usuário deve ser da mesma empresa)
	if existing.IDEmpresa != pesquisa.IDEmpresa {
		return fmt.Errorf("sem permissão para editar esta pesquisa")
	}

	// Verifica se setor existe (se fornecido e alterado)
	if pesquisa.IDSetor > 0 && pesquisa.IDSetor != existing.IDSetor {
		setor, err := uc.setorRepo.GetByID(ctx, pesquisa.IDSetor)
		if err != nil {
			return fmt.Errorf("setor não encontrado: %v", err)
		}
		if setor.IDEmpresa != pesquisa.IDEmpresa {
			return fmt.Errorf("setor não pertence à empresa informada")
		}
	}

	// Valida datas
	if err := uc.ValidatePesquisaDates(pesquisa.DataAbertura, pesquisa.DataFechamento); err != nil {
		return err
	}

	// Não permite alterar alguns campos se pesquisa já está ativa
	if existing.Status == "Ativa" {
		pesquisa.LinkAcesso = existing.LinkAcesso
		pesquisa.Anonimato = existing.Anonimato
	}

	// Preserva campos que não devem ser alterados
	pesquisa.DataCriacao = existing.DataCriacao
	pesquisa.IDUserAdmin = existing.IDUserAdmin

	if err := uc.pesquisaRepo.Update(ctx, pesquisa); err != nil {
		return fmt.Errorf("erro ao atualizar pesquisa: %v", err)
	}

	// Log de auditoria
	log := &entity.LogAuditoria{
		IDUserAdmin:   userAdminID,
		TimeStamp:     time.Now(),
		AcaoRealizada: "Pesquisa Atualizada",
		Detalhes:      fmt.Sprintf("Pesquisa atualizada: %s (ID: %d)", pesquisa.Titulo, pesquisa.ID),
		EnderecoIP:    enderecoIP,
	}
	uc.logAuditoriaRepo.Create(ctx, log)

	return nil
}

// UpdateStatus atualiza o status de uma pesquisa
func (uc *PesquisaUseCase) UpdateStatus(ctx context.Context, id int, status string, userAdminID int, enderecoIP string) error {
	// Valida status
	validStatuses := map[string]bool{
		"Rascunho":  true,
		"Ativa":     true,
		"Concluída": true,
		"Arquivada": true,
	}

	if !validStatuses[status] {
		return fmt.Errorf("status inválido: %s", status)
	}

	// Busca pesquisa para validações
	pesquisa, err := uc.pesquisaRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("pesquisa não encontrada: %v", err)
	}

	// Regras de transição de status
	if err := uc.ValidateStatusTransition(pesquisa.Status, status); err != nil {
		return err
	}

	// Validações específicas para ativação
	if status == "Ativa" {
		if err := uc.ValidateActivation(ctx, pesquisa); err != nil {
			return err
		}
	}

	if err := uc.pesquisaRepo.UpdateStatus(ctx, id, status); err != nil {
		return fmt.Errorf("erro ao atualizar status: %v", err)
	}

	// Log de auditoria
	log := &entity.LogAuditoria{
		IDUserAdmin:   userAdminID,
		TimeStamp:     time.Now(),
		AcaoRealizada: "Status Pesquisa Alterado",
		Detalhes:      fmt.Sprintf("Status alterado de '%s' para '%s' - Pesquisa: %s (ID: %d)", pesquisa.Status, status, pesquisa.Titulo, pesquisa.ID),
		EnderecoIP:    enderecoIP,
	}
	uc.logAuditoriaRepo.Create(ctx, log)

	return nil
}

// ValidateStatusTransition valida transições de status válidas
func (uc *PesquisaUseCase) ValidateStatusTransition(statusAtual, novoStatus string) error {
	transicoes := map[string][]string{
		"Rascunho":  {"Ativa", "Arquivada"},
		"Ativa":     {"Concluída", "Arquivada"},
		"Concluída": {"Arquivada"},
		"Arquivada": {}, // Status final
	}

	statusesPermitidos := transicoes[statusAtual]
	for _, status := range statusesPermitidos {
		if status == novoStatus {
			return nil
		}
	}

	return fmt.Errorf("transição de status inválida: '%s' -> '%s'", statusAtual, novoStatus)
}

// ValidateActivation valida se pesquisa pode ser ativada
func (uc *PesquisaUseCase) ValidateActivation(ctx context.Context, pesquisa *entity.Pesquisa) error {
	// Verifica se tem pelo menos uma pergunta
	// Este método precisaria ser implementado no repository de perguntas
	// perguntas, err := uc.perguntaRepo.ListByPesquisa(ctx, pesquisa.ID)
	// if err != nil {
	//     return fmt.Errorf("erro ao verificar perguntas: %v", err)
	// }
	// if len(perguntas) == 0 {
	//     return fmt.Errorf("pesquisa deve ter pelo menos uma pergunta para ser ativada")
	// }

	// Verifica se as datas estão configuradas corretamente
	now := time.Now()
	if pesquisa.DataAbertura != nil && pesquisa.DataAbertura.Before(now.Add(-24*time.Hour)) {
		return fmt.Errorf("data de abertura não pode ser anterior a ontem")
	}

	return nil
}

// Delete remove uma pesquisa do sistema
func (uc *PesquisaUseCase) Delete(ctx context.Context, id int, userAdminID int, enderecoIP string) error {
	if id <= 0 {
		return fmt.Errorf("ID da pesquisa inválido")
	}

	// Busca pesquisa para log e validações
	pesquisa, err := uc.pesquisaRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("pesquisa não encontrada: %v", err)
	}


	if err := uc.pesquisaRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("erro ao deletar pesquisa: %v", err)
	}

	// Log de auditoria
	log := &entity.LogAuditoria{
		IDUserAdmin:   userAdminID,
		TimeStamp:     time.Now(),
		AcaoRealizada: "Pesquisa Deletada",
		Detalhes:      fmt.Sprintf("Pesquisa deletada: %s (ID: %d)", pesquisa.Titulo, pesquisa.ID),
		EnderecoIP:    enderecoIP,
	}
	uc.logAuditoriaRepo.Create(ctx, log)

	return nil
}

// RegenerateLinkAcesso gera um novo link de acesso para a pesquisa
func (uc *PesquisaUseCase) RegenerateLinkAcesso(ctx context.Context, pesquisaID int, userAdminID int, enderecoIP string) (string, error) {
	if pesquisaID <= 0 {
		return "", fmt.Errorf("ID da pesquisa inválido")
	}

	// Busca pesquisa
	pesquisa, err := uc.pesquisaRepo.GetByID(ctx, pesquisaID)
	if err != nil {
		return "", fmt.Errorf("pesquisa não encontrada: %v", err)
	}

	// Não permite regenerar link de pesquisa ativa
	if pesquisa.Status == "Ativa" {
		return "", fmt.Errorf("não é possível regenerar link de pesquisa ativa")
	}

	// Gera novo link
	novoLink, err := uc.GenerateUniqueLink()
	if err != nil {
		return "", fmt.Errorf("erro ao gerar novo link: %v", err)
	}

	// Atualiza apenas o link
	pesquisa.LinkAcesso = novoLink
	if err := uc.pesquisaRepo.Update(ctx, pesquisa); err != nil {
		return "", fmt.Errorf("erro ao atualizar link: %v", err)
	}

	// Log de auditoria
	log := &entity.LogAuditoria{
		IDUserAdmin:   userAdminID,
		TimeStamp:     time.Now(),
		AcaoRealizada: "Link de Acesso Regenerado",
		Detalhes:      fmt.Sprintf("Novo link gerado para pesquisa: %s (ID: %d)", pesquisa.Titulo, pesquisaID),
		EnderecoIP:    enderecoIP,
	}
	uc.logAuditoriaRepo.Create(ctx, log)

	return novoLink, nil
}
