// Package usecase implementa os casos de uso para análise de dados e métricas.
// Fornece funcionalidades de análise estatística e comparativa das pesquisas.
package usecase

import (
	"context"
	"fmt"
	"organizational-climate-survey/backend/internal/application/dto/response"
	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/domain/repository"
	"time"
)

// AnalyticsUseCase implementa casos de uso para análise de dados
type AnalyticsUseCase struct {
	repo             repository.AnalyticsRepository    // Repositório de análises
	pesquisaRepo     repository.PesquisaRepository     // Repositório de pesquisas
	logAuditoriaRepo repository.LogAuditoriaRepository // Repositório de logs
}

// NewAnalyticsUseCase cria uma nova instância do caso de uso de análises
func NewAnalyticsUseCase(
	repo repository.AnalyticsRepository,
	pesquisaRepo repository.PesquisaRepository,
	logRepo repository.LogAuditoriaRepository,
) *AnalyticsUseCase {
	return &AnalyticsUseCase{
		repo:             repo,
		pesquisaRepo:     pesquisaRepo,
		logAuditoriaRepo: logRepo,
	}
}

// GetPesquisaMetrics retorna métricas agregadas de uma pesquisa específica
func (uc *AnalyticsUseCase) GetPesquisaMetrics(ctx context.Context, pesquisaID int, userAdminID int, enderecoIP string) (map[string]interface{}, error) {
	// Validações
	if pesquisaID <= 0 {
		return nil, fmt.Errorf("ID da pesquisa deve ser maior que zero")
	}

	// Verifica se pesquisa existe
	pesquisa, err := uc.pesquisaRepo.GetByID(ctx, pesquisaID)
	if err != nil {
		return nil, fmt.Errorf("pesquisa não encontrada: %v", err)
	}

	// Só permite visualizar métricas de pesquisas ativas ou concluídas
	if pesquisa.Status == "Rascunho" {
		return nil, fmt.Errorf("não é possível visualizar métricas de pesquisa em rascunho")
	}

	metrics, err := uc.repo.GetPesquisaMetrics(ctx, pesquisaID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar métricas: %v", err)
	}

	// Log de auditoria para acesso às métricas
	if userAdminID > 0 {
		log := &entity.LogAuditoria{
			IDUserAdmin:   userAdminID,
			TimeStamp:     time.Now(),
			AcaoRealizada: "Métricas Acessadas",
			Detalhes:      fmt.Sprintf("Métricas acessadas da pesquisa: %s (ID: %d)", pesquisa.Titulo, pesquisaID),
			EnderecoIP:    enderecoIP,
		}
		uc.logAuditoriaRepo.Create(ctx, log)
	}

	return metrics, nil
}

// GetComparisonData compara métricas entre diferentes pesquisas
// GetComparisonData compara métricas entre diferentes pesquisas
func (uc *AnalyticsUseCase) GetComparisonData(ctx context.Context, pesquisaIDs []int, userAdminID int, enderecoIP string) (map[string]interface{}, error) {
	// Validações
	if len(pesquisaIDs) == 0 {
		return nil, fmt.Errorf("lista de pesquisas não pode estar vazia")
	}

	if len(pesquisaIDs) > 10 {
		return nil, fmt.Errorf("máximo de 10 pesquisas para comparação")
	}

	// Valida IDs
	for i, id := range pesquisaIDs {
		if id <= 0 {
			return nil, fmt.Errorf("ID inválido na posição %d: %d", i, id)
		}
	}

	// Verifica se todas as pesquisas existem e pertencem à mesma empresa
	var empresaID int

	for i, pesquisaID := range pesquisaIDs {
		pesquisa, err := uc.pesquisaRepo.GetByID(ctx, pesquisaID)
		if err != nil {
			return nil, fmt.Errorf("pesquisa ID %d não encontrada: %v", pesquisaID, err)
		}

		// Primeira pesquisa define a empresa
		if i == 0 {
			empresaID = pesquisa.IDEmpresa
		} else if pesquisa.IDEmpresa != empresaID {
			return nil, fmt.Errorf("todas as pesquisas devem pertencer à mesma empresa")
		}

		// Só permite comparar pesquisas concluídas
		if pesquisa.Status != "Concluída" {
			return nil, fmt.Errorf("só é possível comparar pesquisas concluídas. Pesquisa '%s' está com status: %s", pesquisa.Titulo, pesquisa.Status)
		}
	}

	comparison, err := uc.repo.GetComparisonData(ctx, pesquisaIDs)
	if err != nil {
		return nil, fmt.Errorf("erro ao gerar comparação: %v", err)
	}

	// Log de auditoria
	if userAdminID > 0 {
		log := &entity.LogAuditoria{
			IDUserAdmin:   userAdminID,
			TimeStamp:     time.Now(),
			AcaoRealizada: "Comparação de Pesquisas Gerada",
			Detalhes:      fmt.Sprintf("Comparação gerada entre %d pesquisas da empresa ID: %d", len(pesquisaIDs), empresaID),
			EnderecoIP:    enderecoIP,
		}
		uc.logAuditoriaRepo.Create(ctx, log)
	}

	return comparison, nil
}

// GetSetorComparison compara métricas entre diferentes setores de uma pesquisa
func (uc *AnalyticsUseCase) GetSetorComparison(ctx context.Context, empresaID int, pesquisaID int, userAdminID int, enderecoIP string) (map[string]interface{}, error) {
	// Validações
	if empresaID <= 0 {
		return nil, fmt.Errorf("ID da empresa deve ser maior que zero")
	}

	if pesquisaID <= 0 {
		return nil, fmt.Errorf("ID da pesquisa deve ser maior que zero")
	}

	// Verifica se pesquisa existe e pertence à empresa
	pesquisa, err := uc.pesquisaRepo.GetByID(ctx, pesquisaID)
	if err != nil {
		return nil, fmt.Errorf("pesquisa não encontrada: %v", err)
	}

	if pesquisa.IDEmpresa != empresaID {
		return nil, fmt.Errorf("pesquisa não pertence à empresa informada")
	}

	// Só permite comparação de setores se pesquisa não tem setor específico
	if pesquisa.IDSetor > 0 {
		return nil, fmt.Errorf("pesquisa é específica de um setor, não é possível fazer comparação entre setores")
	}

	// Pesquisa deve estar concluída para comparação entre setores
	if pesquisa.Status != "Concluída" {
		return nil, fmt.Errorf("só é possível comparar setores em pesquisas concluídas")
	}

	comparison, err := uc.repo.GetSetorComparison(ctx, empresaID, pesquisaID)
	if err != nil {
		return nil, fmt.Errorf("erro ao gerar comparação por setor: %v", err)
	}

	// Log de auditoria
	if userAdminID > 0 {
		log := &entity.LogAuditoria{
			IDUserAdmin:   userAdminID,
			TimeStamp:     time.Now(),
			AcaoRealizada: "Comparação por Setor Gerada",
			Detalhes:      fmt.Sprintf("Comparação por setor gerada para pesquisa: %s (ID: %d)", pesquisa.Titulo, pesquisaID),
			EnderecoIP:    enderecoIP,
		}
		uc.logAuditoriaRepo.Create(ctx, log)
	}

	return comparison, nil
}

// GetTrendAnalysis analisa tendências das respostas ao longo do tempo
func (uc *AnalyticsUseCase) GetTrendAnalysis(ctx context.Context, empresaID int, period string, userAdminID int, enderecoIP string) (map[string]interface{}, error) {
	if empresaID <= 0 {
		return nil, fmt.Errorf("ID da empresa deve ser maior que zero")
	}

	validPeriods := map[string]bool{
		"7days":  true,
		"30days": true,
		"90days": true,
		"1year":  true,
	}

	if !validPeriods[period] {
		return nil, fmt.Errorf("período inválido: %s. Valores válidos: 7days, 30days, 90days, 1year", period)
	}

	// Este método precisaria ser implementado no repository
	// trends, err := uc.repo.GetTrendAnalysis(ctx, empresaID, period)
	// if err != nil {
	//     return nil, fmt.Errorf("erro ao gerar análise de tendências: %v", err)
	// }

	// Log de auditoria
	if userAdminID > 0 {
		log := &entity.LogAuditoria{
			IDUserAdmin:   userAdminID,
			TimeStamp:     time.Now(),
			AcaoRealizada: "Análise de Tendências Acessada",
			Detalhes:      fmt.Sprintf("Análise de tendências acessada para empresa ID: %d (período: %s)", empresaID, period),
			EnderecoIP:    enderecoIP,
		}
		uc.logAuditoriaRepo.Create(ctx, log)
	}

	// Retorna estrutura básica por enquanto
	return map[string]interface{}{
		"period":     period,
		"empresa_id": empresaID,
		"message":    "Análise de tendências em desenvolvimento",
	}, nil
}

// GetAnalyticsReport gera o relatório analítico principal (Cognitivo e Psicossocial),
// com 4 cenários baseados na matriz de filtros de Setor e Ciclo.
func (uc *AnalyticsUseCase) GetAnalyticsReport(ctx context.Context, req response.AnalyticsFilterRequest) (*response.RelatorioAnalyticsResponse, error) {
	var ciclo string
	if req.Ciclo != nil {
		ciclo = *req.Ciclo
	}

	resp := &response.RelatorioAnalyticsResponse{}

	if req.IDSetor == nil && ciclo != "todos" {
		// Cenário 1: Visão Global (Setor: todos + Ciclo: Específico)
		kpis, err := uc.repo.GetScoresGlobaisPorCiclo(ctx, req.IDEmpresa, ciclo)
		if err != nil {
			return nil, fmt.Errorf("erro ao obter kpis globais: %w", err)
		}
		resp.KPIs = kpis

		radar, err := uc.repo.GetRadarSetores(ctx, req.IDEmpresa, ciclo)
		if err != nil {
			return nil, fmt.Errorf("erro ao obter dados do radar: %w", err)
		}
		radarInterfaces := make([]interface{}, len(radar))
		for i, v := range radar {
			radarInterfaces[i] = v
		}
		resp.Radar = radarInterfaces

		heatmap, err := uc.repo.GetHeatmapGlobal(ctx, req.IDEmpresa, ciclo)
		if err != nil {
			return nil, fmt.Errorf("erro ao obter heatmap: %w", err)
		}
		resp.Heatmap = heatmap

		planos, err := uc.repo.GetRiscosGlobais(ctx, req.IDEmpresa, ciclo)
		if err != nil {
			return nil, fmt.Errorf("erro ao obter planos de ação globais: %w", err)
		}
		resp.PlanosDeAcao = planos

	} else if req.IDSetor == nil && ciclo == "todos" {
		// Cenário 2: Visão Macro Histórica (Setor: todos + Ciclo: todos)
		evolucao, err := uc.repo.GetHistoricoEmpresaGlobal(ctx, req.IDEmpresa)
		if err != nil {
			return nil, fmt.Errorf("erro ao obter histórico global da empresa: %w", err)
		}
		resp.Evolucao = evolucao

	} else if req.IDSetor != nil && ciclo == "todos" {
		// Cenário 3: Visão Micro Histórica (Setor: Específico + Ciclo: todos)
		evolucao, err := uc.repo.GetHistoricoSetor(ctx, req.IDEmpresa, *req.IDSetor)
		if err != nil {
			return nil, fmt.Errorf("erro ao obter histórico do setor: %w", err)
		}
		resp.Evolucao = evolucao

	} else {
		// Cenário 4: Visão Isolada (Setor: Específico + Ciclo: Específico)
		kpis, err := uc.repo.GetScoresSetorPorCiclo(ctx, req.IDEmpresa, *req.IDSetor, ciclo)
		if err != nil {
			return nil, fmt.Errorf("erro ao obter kpis do setor: %w", err)
		}
		resp.KPIs = kpis

		planos, err := uc.repo.GetRiscosSetor(ctx, req.IDEmpresa, *req.IDSetor, ciclo)
		if err != nil {
			return nil, fmt.Errorf("erro ao obter planos de ação do setor: %w", err)
		}
		resp.PlanosDeAcao = planos
	}

	return resp, nil
}
