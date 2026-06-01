package testutils

import (
	"context"
	"errors"
	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/application/dto/response"
	"time"
)

var errNotImplemented = errors.New("mock: not implemented")

type MockDashboardRepository struct {
	CreateFunc          func(context.Context, *entity.Dashboard) error
	GetByIDFunc         func(context.Context, int) (*entity.Dashboard, error)
	GetByPesquisaIDFunc func(context.Context, int) (*entity.Dashboard, error)
	ListByEmpresaFunc   func(context.Context, int) ([]*entity.Dashboard, error)
	UpdateFunc          func(context.Context, *entity.Dashboard) error
	DeleteFunc          func(context.Context, int) error
}

func (m *MockDashboardRepository) Create(ctx context.Context, d *entity.Dashboard) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, d)
	}
	return nil
}
func (m *MockDashboardRepository) GetByID(ctx context.Context, id int) (*entity.Dashboard, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, errNotImplemented
}
func (m *MockDashboardRepository) GetByPesquisaID(ctx context.Context, pesquisaID int) (*entity.Dashboard, error) {
	if m.GetByPesquisaIDFunc != nil {
		return m.GetByPesquisaIDFunc(ctx, pesquisaID)
	}
	return nil, errNotImplemented
}
func (m *MockDashboardRepository) ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.Dashboard, error) {
	if m.ListByEmpresaFunc != nil {
		return m.ListByEmpresaFunc(ctx, empresaID)
	}
	return []*entity.Dashboard{}, nil
}
func (m *MockDashboardRepository) Update(ctx context.Context, d *entity.Dashboard) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, d)
	}
	return nil
}
func (m *MockDashboardRepository) Delete(ctx context.Context, id int) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

type MockEmpresaRepository struct {
	CreateFunc    func(context.Context, *entity.Empresa) error
	GetByIDFunc   func(context.Context, int) (*entity.Empresa, error)
	GetByCNPJFunc func(context.Context, string) (*entity.Empresa, error)
	ListFunc      func(context.Context, int, int) ([]*entity.Empresa, error)
	UpdateFunc    func(context.Context, *entity.Empresa) error
	DeleteFunc    func(context.Context, int) error
}

func (m *MockEmpresaRepository) Create(ctx context.Context, e *entity.Empresa) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, e)
	}
	return nil
}
func (m *MockEmpresaRepository) GetByID(ctx context.Context, id int) (*entity.Empresa, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, errNotImplemented
}
func (m *MockEmpresaRepository) GetByCNPJ(ctx context.Context, cnpj string) (*entity.Empresa, error) {
	if m.GetByCNPJFunc != nil {
		return m.GetByCNPJFunc(ctx, cnpj)
	}
	return nil, errNotImplemented
}
func (m *MockEmpresaRepository) List(ctx context.Context, limit, offset int) ([]*entity.Empresa, error) {
	if m.ListFunc != nil {
		return m.ListFunc(ctx, limit, offset)
	}
	return []*entity.Empresa{}, nil
}
func (m *MockEmpresaRepository) Update(ctx context.Context, e *entity.Empresa) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, e)
	}
	return nil
}
func (m *MockEmpresaRepository) Delete(ctx context.Context, id int) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

type MockLogAuditoriaRepository struct {
	CreateFunc             func(context.Context, *entity.LogAuditoria) error
	GetByIDFunc            func(context.Context, int) (*entity.LogAuditoria, error)
	ListByEmpresaFunc      func(context.Context, int, int, int) ([]*entity.LogAuditoria, error)
	ListByUsuarioAdminFunc func(context.Context, int, int, int) ([]*entity.LogAuditoria, error)
	ListByDateRangeFunc    func(context.Context, int, string, string) ([]*entity.LogAuditoria, error)
}

func (m *MockLogAuditoriaRepository) Create(ctx context.Context, l *entity.LogAuditoria) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, l)
	}
	return nil
}
func (m *MockLogAuditoriaRepository) GetByID(ctx context.Context, id int) (*entity.LogAuditoria, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, errNotImplemented
}
func (m *MockLogAuditoriaRepository) ListByEmpresa(ctx context.Context, empresaID int, limit, offset int) ([]*entity.LogAuditoria, error) {
	if m.ListByEmpresaFunc != nil {
		return m.ListByEmpresaFunc(ctx, empresaID, limit, offset)
	}
	return []*entity.LogAuditoria{}, nil
}
func (m *MockLogAuditoriaRepository) ListByUsuarioAdmin(ctx context.Context, userAdminID int, limit, offset int) ([]*entity.LogAuditoria, error) {
	if m.ListByUsuarioAdminFunc != nil {
		return m.ListByUsuarioAdminFunc(ctx, userAdminID, limit, offset)
	}
	return []*entity.LogAuditoria{}, nil
}
func (m *MockLogAuditoriaRepository) ListByDateRange(ctx context.Context, empresaID int, startDate, endDate string) ([]*entity.LogAuditoria, error) {
	if m.ListByDateRangeFunc != nil {
		return m.ListByDateRangeFunc(ctx, empresaID, startDate, endDate)
	}
	return []*entity.LogAuditoria{}, nil
}

type MockPesquisaRepository struct {
	CreateFunc          func(context.Context, *entity.Pesquisa) error
	GetByIDFunc         func(context.Context, int) (*entity.Pesquisa, error)
	GetByLinkAcessoFunc func(context.Context, string) (*entity.Pesquisa, error)
	ListByEmpresaFunc   func(context.Context, int) ([]*entity.Pesquisa, error)
	ListBySetorFunc     func(context.Context, int) ([]*entity.Pesquisa, error)
	ListByStatusFunc    func(context.Context, int, string) ([]*entity.Pesquisa, error)
	ListActiveFunc      func(context.Context, int) ([]*entity.Pesquisa, error)
	UpdateFunc          func(context.Context, *entity.Pesquisa) error
	UpdateStatusFunc    func(context.Context, int, string) error
	DeleteFunc          func(context.Context, int) error
}

func (m *MockPesquisaRepository) Create(ctx context.Context, p *entity.Pesquisa) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, p)
	}
	return nil
}
func (m *MockPesquisaRepository) GetByID(ctx context.Context, id int) (*entity.Pesquisa, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, errNotImplemented
}
func (m *MockPesquisaRepository) GetByLinkAcesso(ctx context.Context, link string) (*entity.Pesquisa, error) {
	if m.GetByLinkAcessoFunc != nil {
		return m.GetByLinkAcessoFunc(ctx, link)
	}
	return nil, errNotImplemented
}
func (m *MockPesquisaRepository) ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.Pesquisa, error) {
	if m.ListByEmpresaFunc != nil {
		return m.ListByEmpresaFunc(ctx, empresaID)
	}
	return []*entity.Pesquisa{}, nil
}
func (m *MockPesquisaRepository) ListBySetor(ctx context.Context, setorID int) ([]*entity.Pesquisa, error) {
	if m.ListBySetorFunc != nil {
		return m.ListBySetorFunc(ctx, setorID)
	}
	return []*entity.Pesquisa{}, nil
}
func (m *MockPesquisaRepository) ListByStatus(ctx context.Context, empresaID int, status string) ([]*entity.Pesquisa, error) {
	if m.ListByStatusFunc != nil {
		return m.ListByStatusFunc(ctx, empresaID, status)
	}
	return []*entity.Pesquisa{}, nil
}
func (m *MockPesquisaRepository) ListActive(ctx context.Context, empresaID int) ([]*entity.Pesquisa, error) {
	if m.ListActiveFunc != nil {
		return m.ListActiveFunc(ctx, empresaID)
	}
	return []*entity.Pesquisa{}, nil
}
func (m *MockPesquisaRepository) Update(ctx context.Context, p *entity.Pesquisa) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, p)
	}
	return nil
}
func (m *MockPesquisaRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	if m.UpdateStatusFunc != nil {
		return m.UpdateStatusFunc(ctx, id, status)
	}
	return nil
}
func (m *MockPesquisaRepository) Delete(ctx context.Context, id int) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

type MockPerguntaRepository struct {
	CreateFunc         func(context.Context, *entity.Pergunta) error
	CreateBatchFunc    func(context.Context, []*entity.Pergunta) error
	GetByIDFunc        func(context.Context, int) (*entity.Pergunta, error)
	ListByPesquisaFunc func(context.Context, int) ([]*entity.Pergunta, error)
	UpdateFunc         func(context.Context, *entity.Pergunta) error
	DeleteFunc         func(context.Context, int) error
	UpdateOrdemFunc    func(context.Context, int, int) error
}

func (m *MockPerguntaRepository) Create(ctx context.Context, p *entity.Pergunta) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, p)
	}
	return nil
}
func (m *MockPerguntaRepository) CreateBatch(ctx context.Context, p []*entity.Pergunta) error {
	if m.CreateBatchFunc != nil {
		return m.CreateBatchFunc(ctx, p)
	}
	return nil
}
func (m *MockPerguntaRepository) GetByID(ctx context.Context, id int) (*entity.Pergunta, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, errNotImplemented
}
func (m *MockPerguntaRepository) ListByPesquisa(ctx context.Context, pesquisaID int) ([]*entity.Pergunta, error) {
	if m.ListByPesquisaFunc != nil {
		return m.ListByPesquisaFunc(ctx, pesquisaID)
	}
	return []*entity.Pergunta{}, nil
}
func (m *MockPerguntaRepository) Update(ctx context.Context, p *entity.Pergunta) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, p)
	}
	return nil
}
func (m *MockPerguntaRepository) Delete(ctx context.Context, id int) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}
func (m *MockPerguntaRepository) UpdateOrdem(ctx context.Context, perguntaID int, novaOrdem int) error {
	if m.UpdateOrdemFunc != nil {
		return m.UpdateOrdemFunc(ctx, perguntaID, novaOrdem)
	}
	return nil
}

type MockRespostaRepository struct {
	CreateBatchFunc             func(context.Context, []*entity.Resposta) error
	GetByIDFunc                 func(context.Context, int) (*entity.Resposta, error)
	CountByPesquisaFunc         func(context.Context, int) (int, error)
	CountByPerguntaFunc         func(context.Context, int) (int, error)
	CountBySubmissaoFunc        func(context.Context, int) (int, error)
	GetAggregatedByPerguntaFunc func(context.Context, int) (map[string]int, error)
	GetAggregatedByPesquisaFunc func(context.Context, int) (map[int]map[string]int, error)
	GetResponsesByDateRangeFunc func(context.Context, int, string, string) ([]*entity.Resposta, error)
	GetBySubmissaoFunc          func(context.Context, int) ([]*entity.Resposta, error)
	ListByPesquisaFunc          func(context.Context, int) ([]*entity.Resposta, error)
	DeleteByPesquisaFunc        func(context.Context, int) error
	DeleteBySubmissaoFunc       func(context.Context, int) error
}

func (m *MockRespostaRepository) CreateBatch(ctx context.Context, respostas []*entity.Resposta) error {
	if m.CreateBatchFunc != nil {
		return m.CreateBatchFunc(ctx, respostas)
	}
	return nil
}
func (m *MockRespostaRepository) GetByID(ctx context.Context, id int) (*entity.Resposta, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, errNotImplemented
}
func (m *MockRespostaRepository) CountByPesquisa(ctx context.Context, pesquisaID int) (int, error) {
	if m.CountByPesquisaFunc != nil {
		return m.CountByPesquisaFunc(ctx, pesquisaID)
	}
	return 0, nil
}
func (m *MockRespostaRepository) CountByPergunta(ctx context.Context, perguntaID int) (int, error) {
	if m.CountByPerguntaFunc != nil {
		return m.CountByPerguntaFunc(ctx, perguntaID)
	}
	return 0, nil
}
func (m *MockRespostaRepository) CountBySubmissao(ctx context.Context, submissaoID int) (int, error) {
	if m.CountBySubmissaoFunc != nil {
		return m.CountBySubmissaoFunc(ctx, submissaoID)
	}
	return 0, nil
}
func (m *MockRespostaRepository) GetAggregatedByPergunta(ctx context.Context, perguntaID int) (map[string]int, error) {
	if m.GetAggregatedByPerguntaFunc != nil {
		return m.GetAggregatedByPerguntaFunc(ctx, perguntaID)
	}
	return map[string]int{}, nil
}
func (m *MockRespostaRepository) GetAggregatedByPesquisa(ctx context.Context, pesquisaID int) (map[int]map[string]int, error) {
	if m.GetAggregatedByPesquisaFunc != nil {
		return m.GetAggregatedByPesquisaFunc(ctx, pesquisaID)
	}
	return map[int]map[string]int{}, nil
}
func (m *MockRespostaRepository) GetResponsesByDateRange(ctx context.Context, pesquisaID int, startDate, endDate string) ([]*entity.Resposta, error) {
	if m.GetResponsesByDateRangeFunc != nil {
		return m.GetResponsesByDateRangeFunc(ctx, pesquisaID, startDate, endDate)
	}
	return []*entity.Resposta{}, nil
}
func (m *MockRespostaRepository) GetBySubmissao(ctx context.Context, submissaoID int) ([]*entity.Resposta, error) {
	if m.GetBySubmissaoFunc != nil {
		return m.GetBySubmissaoFunc(ctx, submissaoID)
	}
	return []*entity.Resposta{}, nil
}
func (m *MockRespostaRepository) ListByPesquisa(ctx context.Context, pesquisaID int) ([]*entity.Resposta, error) {
	if m.ListByPesquisaFunc != nil {
		return m.ListByPesquisaFunc(ctx, pesquisaID)
	}
	return []*entity.Resposta{}, nil
}
func (m *MockRespostaRepository) DeleteByPesquisa(ctx context.Context, pesquisaID int) error {
	if m.DeleteByPesquisaFunc != nil {
		return m.DeleteByPesquisaFunc(ctx, pesquisaID)
	}
	return nil
}
func (m *MockRespostaRepository) DeleteBySubmissao(ctx context.Context, submissaoID int) error {
	if m.DeleteBySubmissaoFunc != nil {
		return m.DeleteBySubmissaoFunc(ctx, submissaoID)
	}
	return nil
}

type MockSetorRepository struct {
	CreateFunc        func(context.Context, *entity.Setor) error
	GetByIDFunc       func(context.Context, int) (*entity.Setor, error)
	GetByNomeFunc     func(context.Context, int, string) (*entity.Setor, error)
	ListByEmpresaFunc func(context.Context, int) ([]*entity.Setor, error)
	UpdateFunc        func(context.Context, *entity.Setor) error
	DeleteFunc        func(context.Context, int) error
}

func (m *MockSetorRepository) Create(ctx context.Context, s *entity.Setor) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, s)
	}
	return nil
}
func (m *MockSetorRepository) GetByID(ctx context.Context, id int) (*entity.Setor, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, errNotImplemented
}
func (m *MockSetorRepository) GetByNome(ctx context.Context, empresaID int, nome string) (*entity.Setor, error) {
	if m.GetByNomeFunc != nil {
		return m.GetByNomeFunc(ctx, empresaID, nome)
	}
	return nil, errNotImplemented
}
func (m *MockSetorRepository) ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.Setor, error) {
	if m.ListByEmpresaFunc != nil {
		return m.ListByEmpresaFunc(ctx, empresaID)
	}
	return []*entity.Setor{}, nil
}
func (m *MockSetorRepository) Update(ctx context.Context, s *entity.Setor) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, s)
	}
	return nil
}
func (m *MockSetorRepository) Delete(ctx context.Context, id int) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

type MockUsuarioAdministradorRepository struct {
	CreateFunc         func(context.Context, *entity.UsuarioAdministrador) error
	GetByIDFunc        func(context.Context, int) (*entity.UsuarioAdministrador, error)
	GetByEmailFunc     func(context.Context, string) (*entity.UsuarioAdministrador, error)
	UpdateFunc         func(context.Context, *entity.UsuarioAdministrador) error
	UpdatePasswordFunc func(context.Context, int, string) error
	UpdateStatusFunc   func(context.Context, int, string) error
	ListByEmpresaFunc  func(context.Context, int) ([]*entity.UsuarioAdministrador, error)
	ListByStatusFunc   func(context.Context, int, string) ([]*entity.UsuarioAdministrador, error)
	CountFunc          func(context.Context) (int, error)
}

func (m *MockUsuarioAdministradorRepository) Create(ctx context.Context, u *entity.UsuarioAdministrador) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, u)
	}
	return nil
}
func (m *MockUsuarioAdministradorRepository) GetByID(ctx context.Context, id int) (*entity.UsuarioAdministrador, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, errNotImplemented
}
func (m *MockUsuarioAdministradorRepository) GetByEmail(ctx context.Context, email string) (*entity.UsuarioAdministrador, error) {
	if m.GetByEmailFunc != nil {
		return m.GetByEmailFunc(ctx, email)
	}
	return nil, errNotImplemented
}
func (m *MockUsuarioAdministradorRepository) Update(ctx context.Context, u *entity.UsuarioAdministrador) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, u)
	}
	return nil
}
func (m *MockUsuarioAdministradorRepository) UpdatePassword(ctx context.Context, userID int, hashedPassword string) error {
	if m.UpdatePasswordFunc != nil {
		return m.UpdatePasswordFunc(ctx, userID, hashedPassword)
	}
	return nil
}
func (m *MockUsuarioAdministradorRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	if m.UpdateStatusFunc != nil {
		return m.UpdateStatusFunc(ctx, id, status)
	}
	return nil
}
func (m *MockUsuarioAdministradorRepository) ListByEmpresa(ctx context.Context, empresaID int) ([]*entity.UsuarioAdministrador, error) {
	if m.ListByEmpresaFunc != nil {
		return m.ListByEmpresaFunc(ctx, empresaID)
	}
	return []*entity.UsuarioAdministrador{}, nil
}
func (m *MockUsuarioAdministradorRepository) ListByStatus(ctx context.Context, empresaID int, status string) ([]*entity.UsuarioAdministrador, error) {
	if m.ListByStatusFunc != nil {
		return m.ListByStatusFunc(ctx, empresaID, status)
	}
	return []*entity.UsuarioAdministrador{}, nil
}
func (m *MockUsuarioAdministradorRepository) Count(ctx context.Context) (int, error) {
	if m.CountFunc != nil {
		return m.CountFunc(ctx)
	}
	return 0, nil
}

type MockAnalyticsRepository struct {
	GetPesquisaMetricsFunc func(context.Context, int) (map[string]interface{}, error)
	GetComparisonDataFunc  func(context.Context, []int) (map[string]interface{}, error)
	GetSetorComparisonFunc func(context.Context, int, int) (map[string]interface{}, error)
}

func (m *MockAnalyticsRepository) GetPesquisaMetrics(ctx context.Context, pesquisaID int) (map[string]interface{}, error) {
	if m.GetPesquisaMetricsFunc != nil {
		return m.GetPesquisaMetricsFunc(ctx, pesquisaID)
	}
	return map[string]interface{}{}, nil
}
func (m *MockAnalyticsRepository) GetComparisonData(ctx context.Context, pesquisaIDs []int) (map[string]interface{}, error) {
	if m.GetComparisonDataFunc != nil {
		return m.GetComparisonDataFunc(ctx, pesquisaIDs)
	}
	return map[string]interface{}{}, nil
}
func (m *MockAnalyticsRepository) GetSetorComparison(ctx context.Context, empresaID int, pesquisaID int) (map[string]interface{}, error) {
	if m.GetSetorComparisonFunc != nil {
		return m.GetSetorComparisonFunc(ctx, empresaID, pesquisaID)
	}
	return map[string]interface{}{}, nil
}

func (m *MockAnalyticsRepository) GetScoresGlobaisPorCiclo(ctx context.Context, idEmpresa int, ciclo string) ([]response.AnalyticsKPI, error) {
	return nil, nil
}
func (m *MockAnalyticsRepository) GetRadarSetores(ctx context.Context, idEmpresa int, ciclo string) ([]map[string]interface{}, error) {
	return nil, nil
}
func (m *MockAnalyticsRepository) GetHeatmapGlobal(ctx context.Context, idEmpresa int, ciclo string) ([]response.HeatmapData, error) {
	return nil, nil
}
func (m *MockAnalyticsRepository) GetRiscosGlobais(ctx context.Context, idEmpresa int, ciclo string) ([]response.ActionPlan, error) {
	return nil, nil
}
func (m *MockAnalyticsRepository) GetScoresSetorPorCiclo(ctx context.Context, idEmpresa int, idSetor int, ciclo string) ([]response.AnalyticsKPI, error) {
	return nil, nil
}
func (m *MockAnalyticsRepository) GetHistoricoSetor(ctx context.Context, idEmpresa int, idSetor int) ([]response.LineChartData, error) {
	return nil, nil
}
func (m *MockAnalyticsRepository) GetHistoricoEmpresaGlobal(ctx context.Context, idEmpresa int) ([]response.LineChartData, error) {
	return nil, nil
}
func (m *MockAnalyticsRepository) GetRiscosSetor(ctx context.Context, idEmpresa int, idSetor int, ciclo string) ([]response.ActionPlan, error) {
	return nil, nil
}

type MockSubmissaoPesquisaRepository struct {
	CreateFunc                    func(context.Context, *entity.SubmissaoPesquisa) error
	GetByTokenFunc                func(context.Context, string) (*entity.SubmissaoPesquisa, error)
	GetByIDFunc                   func(context.Context, int) (*entity.SubmissaoPesquisa, error)
	UpdateStatusFunc              func(context.Context, int, string) error
	MarkAsCompletedFunc           func(context.Context, int) error
	CountByPesquisaAndIPHashFunc          func(context.Context, int, string, time.Time) (int, error)
	CountByPesquisaAndSignalsFunc         func(context.Context, int, string, string, string, time.Time) (int, error)
	CountByPesquisaAndFingerprintHashFunc func(context.Context, int, string, time.Time) (int, error)
	DeleteExpiredFunc                     func(context.Context) (int, error)
	ListByPesquisaFunc            func(context.Context, int) ([]*entity.SubmissaoPesquisa, error)
	CountCompleteByPesquisaFunc   func(context.Context, int) (int, error)
	AnonymizePersonalDataFunc     func(context.Context, int, string) error
}

func (m *MockSubmissaoPesquisaRepository) Create(ctx context.Context, s *entity.SubmissaoPesquisa) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, s)
	}
	return nil
}
func (m *MockSubmissaoPesquisaRepository) GetByToken(ctx context.Context, token string) (*entity.SubmissaoPesquisa, error) {
	if m.GetByTokenFunc != nil {
		return m.GetByTokenFunc(ctx, token)
	}
	return nil, errNotImplemented
}
func (m *MockSubmissaoPesquisaRepository) GetByID(ctx context.Context, id int) (*entity.SubmissaoPesquisa, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, errNotImplemented
}
func (m *MockSubmissaoPesquisaRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	if m.UpdateStatusFunc != nil {
		return m.UpdateStatusFunc(ctx, id, status)
	}
	return nil
}
func (m *MockSubmissaoPesquisaRepository) MarkAsCompleted(ctx context.Context, id int) error {
	if m.MarkAsCompletedFunc != nil {
		return m.MarkAsCompletedFunc(ctx, id)
	}
	return nil
}
func (m *MockSubmissaoPesquisaRepository) CountByPesquisaAndIPHash(ctx context.Context, pesquisaID int, ipHash string, since time.Time) (int, error) {
	if m.CountByPesquisaAndIPHashFunc != nil {
		return m.CountByPesquisaAndIPHashFunc(ctx, pesquisaID, ipHash, since)
	}
	return 0, nil
}
func (m *MockSubmissaoPesquisaRepository) CountByPesquisaAndSignals(ctx context.Context, pesquisaID int, ipHash, userAgentHash, acceptLanguageHash string, since time.Time) (int, error) {
	if m.CountByPesquisaAndSignalsFunc != nil {
		return m.CountByPesquisaAndSignalsFunc(ctx, pesquisaID, ipHash, userAgentHash, acceptLanguageHash, since)
	}
	return 0, nil
}
func (m *MockSubmissaoPesquisaRepository) CountByPesquisaAndFingerprintHash(ctx context.Context, pesquisaID int, fingerprintHash string, since time.Time) (int, error) {
	if m.CountByPesquisaAndFingerprintHashFunc != nil {
		return m.CountByPesquisaAndFingerprintHashFunc(ctx, pesquisaID, fingerprintHash, since)
	}
	return 0, nil
}
func (m *MockSubmissaoPesquisaRepository) DeleteExpired(ctx context.Context) (int, error) {
	if m.DeleteExpiredFunc != nil {
		return m.DeleteExpiredFunc(ctx)
	}
	return 0, nil
}
func (m *MockSubmissaoPesquisaRepository) ListByPesquisa(ctx context.Context, pesquisaID int) ([]*entity.SubmissaoPesquisa, error) {
	if m.ListByPesquisaFunc != nil {
		return m.ListByPesquisaFunc(ctx, pesquisaID)
	}
	return []*entity.SubmissaoPesquisa{}, nil
}
func (m *MockSubmissaoPesquisaRepository) CountCompleteByPesquisa(ctx context.Context, pesquisaID int) (int, error) {
	if m.CountCompleteByPesquisaFunc != nil {
		return m.CountCompleteByPesquisaFunc(ctx, pesquisaID)
	}
	return 0, nil
}
func (m *MockSubmissaoPesquisaRepository) AnonymizePersonalData(ctx context.Context, id int, anonymizedToken string) error {
	if m.AnonymizePersonalDataFunc != nil {
		return m.AnonymizePersonalDataFunc(ctx, id, anonymizedToken)
	}
	return nil
}
