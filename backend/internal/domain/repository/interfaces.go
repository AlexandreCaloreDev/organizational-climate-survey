// Package repository define as interfaces dos repositórios do sistema.
// Fornece contratos para implementação das operações de persistência de dados.
package repository

import (
	"context"
	"organizational-climate-survey/backend/internal/application/dto/response"
	"organizational-climate-survey/backend/internal/domain/entity"
	"time"
)

// DashboardRepository gerencia operações relacionadas aos dashboards
type DashboardRepository interface {
	Create(ctx context.Context, dashboard *entity.Dashboard) error                  // Cria novo dashboard
	GetByID(ctx context.Context, id int) (*entity.Dashboard, error)                 // Busca por ID
	GetByPesquisaID(ctx context.Context, pesquisaID int) (*entity.Dashboard, error) // Busca por pesquisa
	ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.Dashboard, error)  // Lista por empresa
	Update(ctx context.Context, dashboard *entity.Dashboard) error                  // Atualiza dashboard
	Delete(ctx context.Context, id int) error                                       // Remove dashboard
}

// EmpresaRepository gerencia operações relacionadas às empresas
type EmpresaRepository interface {
	Create(ctx context.Context, empresa *entity.Empresa) error              // Cria nova empresa
	GetByID(ctx context.Context, id int) (*entity.Empresa, error)           // Busca por ID
	GetByCNPJ(ctx context.Context, cnpj string) (*entity.Empresa, error)    // Busca por CNPJ
	List(ctx context.Context, limit, offset int) ([]*entity.Empresa, error) // Lista paginada
	Update(ctx context.Context, empresa *entity.Empresa) error              // Atualiza empresa
	Delete(ctx context.Context, id int) error                               // Remove empresa
}

// LogAuditoriaRepository gerencia logs de auditoria
type LogAuditoriaRepository interface {
	Create(ctx context.Context, log *entity.LogAuditoria) error
	GetByID(ctx context.Context, id int) (*entity.LogAuditoria, error)
	ListByEmpresa(ctx context.Context, empresaID int, limit, offset int) ([]*entity.LogAuditoria, error)
	ListByUsuarioAdmin(ctx context.Context, userAdminID int, limit, offset int) ([]*entity.LogAuditoria, error)
	ListByDateRange(ctx context.Context, empresaID int, startDate, endDate string) ([]*entity.LogAuditoria, error)
}

// PesquisaRepository gerencia operações relacionadas às pesquisas
type PesquisaRepository interface {
	Create(ctx context.Context, pesquisa *entity.Pesquisa) error
	GetByID(ctx context.Context, id int) (*entity.Pesquisa, error)
	GetByLinkAcesso(ctx context.Context, link string) (*entity.Pesquisa, error)
	ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.Pesquisa, error)
	ListBySetor(ctx context.Context, setorID int) ([]*entity.Pesquisa, error)
	ListByStatus(ctx context.Context, empresaID int, status string) ([]*entity.Pesquisa, error)
	ListActive(ctx context.Context, empresaID int) ([]*entity.Pesquisa, error)
	Update(ctx context.Context, pesquisa *entity.Pesquisa) error
	UpdateStatus(ctx context.Context, id int, status string) error
	Delete(ctx context.Context, id int) error
}

// PerguntaRepository gerencia operações relacionadas às perguntas
type PerguntaRepository interface {
	Create(ctx context.Context, pergunta *entity.Pergunta) error
	CreateBatch(ctx context.Context, perguntas []*entity.Pergunta) error // Para criar múltiplas perguntas
	GetByID(ctx context.Context, id int) (*entity.Pergunta, error)
	ListByPesquisa(ctx context.Context, pesquisaID int) ([]*entity.Pergunta, error)
	Update(ctx context.Context, pergunta *entity.Pergunta) error
	Delete(ctx context.Context, id int) error
	UpdateOrdem(ctx context.Context, perguntaID int, novaOrdem int) error
}

// RespostaRepository define operações de persistência para respostas de pesquisas
type RespostaRepository interface {
	// CreateBatch insere múltiplas respostas em uma única transação
	// CRÍTICO: Todas as respostas DEVEM ter IDSubmissao preenchido
	CreateBatch(ctx context.Context, respostas []*entity.Resposta) error

	// GetByID busca uma resposta específica pelo identificador
	// Inclui dados da submissão e pergunta associadas
	GetByID(ctx context.Context, id int) (*entity.Resposta, error)

	// CountByPesquisa retorna total de respostas de uma pesquisa
	CountByPesquisa(ctx context.Context, pesquisaID int) (int, error)

	// CountByPergunta retorna total de respostas de uma pergunta específica
	CountByPergunta(ctx context.Context, perguntaID int) (int, error)

	// CountBySubmissao retorna total de respostas de uma submissão
	// Útil para validar completude (todas perguntas respondidas)
	CountBySubmissao(ctx context.Context, submissaoID int) (int, error)

	// GetAggregatedByPergunta retorna distribuição de respostas agregadas
	// Exemplo: {"Sim": 45, "Não": 12}
	GetAggregatedByPergunta(ctx context.Context, perguntaID int) (map[string]int, error)

	// GetAggregatedByPesquisa retorna dados agregados de todas as perguntas
	// Formato: map[id_pergunta]map[valor_resposta]contagem
	// Exemplo: {1: {"Sim": 45, "Não": 12}, 2: {"8": 30, "9": 25}}
	GetAggregatedByPesquisa(ctx context.Context, pesquisaID int) (map[int]map[string]int, error)

	// GetResponsesByDateRange retorna respostas em um período específico
	// Datas no formato: "2006-01-02"
	GetResponsesByDateRange(ctx context.Context, pesquisaID int, startDate, endDate string) ([]*entity.Resposta, error)

	// GetBySubmissao busca todas as respostas de uma submissão específica
	// Mantém vínculo entre respostas do mesmo respondente anônimo
	GetBySubmissao(ctx context.Context, submissaoID int) ([]*entity.Resposta, error)

	// ListByPesquisa retorna todas as respostas de uma pesquisa
	// ATENÇÃO: Não expor em endpoints públicos - dados agregados apenas
	ListByPesquisa(ctx context.Context, pesquisaID int) ([]*entity.Resposta, error)

	// DeleteByPesquisa remove todas as respostas de uma pesquisa
	// Cascata: Remove submissões e respostas vinculadas
	// Usar apenas para limpeza pós-análise ou LGPD
	DeleteByPesquisa(ctx context.Context, pesquisaID int) error

	// DeleteBySubmissao remove todas as respostas de uma submissão específica
	// Útil para casos de retração ou dados corrompidos
	DeleteBySubmissao(ctx context.Context, submissaoID int) error
}

// SetorRepository gerencia operações relacionadas aos setores
type SetorRepository interface {
	Create(ctx context.Context, setor *entity.Setor) error
	GetByID(ctx context.Context, id int) (*entity.Setor, error)
	GetByNome(ctx context.Context, empresaID int, nome string) (*entity.Setor, error)
	ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.Setor, error)
	Update(ctx context.Context, setor *entity.Setor) error
	Delete(ctx context.Context, id int) error
}

// UsuarioAdministradorRepository gerencia operações relacionadas aos usuários administradores
type UsuarioAdministradorRepository interface {
	Create(ctx context.Context, usuario *entity.UsuarioAdministrador) error
	GetByID(ctx context.Context, id int) (*entity.UsuarioAdministrador, error)
	GetByEmail(ctx context.Context, email string) (*entity.UsuarioAdministrador, error)
	Update(ctx context.Context, usuario *entity.UsuarioAdministrador) error
	UpdatePassword(ctx context.Context, userID int, hashedPassword string) error
	UpdateStatus(ctx context.Context, id int, status string) error
	ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.UsuarioAdministrador, error)
	ListByStatus(ctx context.Context, empresaID int, status string) ([]*entity.UsuarioAdministrador, error)
	Count(ctx context.Context) (int, error)
}

// Interfaces para operações mais complexas que podem envolver múltiplas entidades

// AnalyticsRepository para operações de análise de dados
type AnalyticsRepository interface {
	GetPesquisaMetrics(ctx context.Context, pesquisaID int) (map[string]interface{}, error)
	GetComparisonData(ctx context.Context, pesquisaIDs []int) (map[string]interface{}, error)
	GetSetorComparison(ctx context.Context, empresaID int, pesquisaID int) (map[string]interface{}, error)

	// NR17 / Relatório Cognitivo Methods
	GetScoresGlobaisPorCiclo(ctx context.Context, idEmpresa int, ciclo string) ([]response.AnalyticsKPI, error)
	GetRadarSetores(ctx context.Context, idEmpresa int, ciclo string) ([]map[string]interface{}, error)
	GetHeatmapGlobal(ctx context.Context, idEmpresa int, ciclo string) ([]response.HeatmapData, error)
	GetRiscosGlobais(ctx context.Context, idEmpresa int, ciclo string) ([]response.ActionPlan, error)
	GetScoresSetorPorCiclo(ctx context.Context, idEmpresa int, idSetor int, ciclo string) ([]response.AnalyticsKPI, error)
	GetHistoricoSetor(ctx context.Context, idEmpresa int, idSetor int) ([]response.LineChartData, error)
	GetHistoricoEmpresaGlobal(ctx context.Context, idEmpresa int) ([]response.LineChartData, error)
	GetRiscosSetor(ctx context.Context, idEmpresa int, idSetor int, ciclo string) ([]response.ActionPlan, error)
}

type SubmissaoPesquisaRepository interface {
	Create(ctx context.Context, submissao *entity.SubmissaoPesquisa) error
	GetByToken(ctx context.Context, token string) (*entity.SubmissaoPesquisa, error)
	GetByID(ctx context.Context, id int) (*entity.SubmissaoPesquisa, error)
	UpdateStatus(ctx context.Context, id int, status string) error
	MarkAsCompleted(ctx context.Context, id int) error
	CountByPesquisaAndIPHash(ctx context.Context, pesquisaID int, ipHash string, since time.Time) (int, error)
	CountByPesquisaAndSignals(ctx context.Context, pesquisaID int, ipHash, userAgentHash, acceptLanguageHash string, since time.Time) (int, error)
	CountByPesquisaAndFingerprintHash(ctx context.Context, pesquisaID int, fingerprintHash string, since time.Time) (int, error)
	DeleteExpired(ctx context.Context) (int, error)
	ListByPesquisa(ctx context.Context, pesquisaID int) ([]*entity.SubmissaoPesquisa, error)
	CountCompleteByPesquisa(ctx context.Context, pesquisaID int) (int, error)
	AnonymizePersonalData(ctx context.Context, id int, anonymizedToken string) error
}
