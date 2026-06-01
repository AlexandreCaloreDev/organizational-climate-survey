package usecase

import (
	"context"
	"strings"
	"testing"
	"time"

	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/testutils"
)

func TestPesquisaUseCaseCreateUpdateStatusAndRegenerateLink(t *testing.T) {
	pesquisaRepo := &testutils.MockPesquisaRepository{}
	empresaRepo := &testutils.MockEmpresaRepository{}
	setorRepo := &testutils.MockSetorRepository{}
	dashboardRepo := &testutils.MockDashboardRepository{}
	logRepo := &testutils.MockLogAuditoriaRepository{}

	empresaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Empresa, error) {
		return &entity.Empresa{ID: id}, nil
	}
	createdPesquisa := false
	pesquisaRepo.CreateFunc = func(ctx context.Context, p *entity.Pesquisa) error {
		createdPesquisa = true
		p.ID = 99
		return nil
	}
	dashboardRepo.CreateFunc = func(ctx context.Context, d *entity.Dashboard) error {
		d.ID = 100
		return nil
	}
	pesquisaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Pesquisa, error) {
		return &entity.Pesquisa{
			ID:          id,
			IDEmpresa:   1,
			IDUserAdmin: 10,
			Titulo:      "Pesquisa teste",
			Status:      "Rascunho",
			LinkAcesso:  "old-link",
			DataCriacao: time.Now().Add(-time.Hour),
		}, nil
	}
	updatedStatus := false
	pesquisaRepo.UpdateStatusFunc = func(ctx context.Context, id int, status string) error {
		updatedStatus = true
		if status != "Ativa" {
			t.Fatalf("expected status Ativa, got %s", status)
		}
		return nil
	}
	updated := false
	pesquisaRepo.UpdateFunc = func(ctx context.Context, p *entity.Pesquisa) error {
		updated = true
		if p.LinkAcesso == "old-link" {
			t.Fatal("expected regenerated link")
		}
		return nil
	}

	uc := NewPesquisaUseCase(pesquisaRepo, empresaRepo, setorRepo, dashboardRepo, logRepo)
	pesquisa := &entity.Pesquisa{IDEmpresa: 1, Titulo: "Pesquisa teste"}

	if err := uc.Create(context.Background(), pesquisa, 10, "127.0.0.1"); err != nil {
		t.Fatalf("unexpected create error: %v", err)
	}
	if !createdPesquisa {
		t.Fatal("expected pesquisa create call")
	}
	if pesquisa.Status != "Rascunho" || !pesquisa.Anonimato || pesquisa.LinkAcesso == "" {
		t.Fatalf("unexpected pesquisa defaults after create: %+v", pesquisa)
	}

	if err := uc.UpdateStatus(context.Background(), 99, "Ativa", 10, "127.0.0.1"); err != nil {
		t.Fatalf("unexpected update status error: %v", err)
	}
	if !updatedStatus {
		t.Fatal("expected update status repository call")
	}

	newLink, err := uc.RegenerateLinkAcesso(context.Background(), 99, 10, "127.0.0.1")
	if err != nil {
		t.Fatalf("unexpected regenerate link error: %v", err)
	}
	if newLink == "" || newLink == "old-link" {
		t.Fatalf("expected a new non-empty link, got %q", newLink)
	}
	if !updated {
		t.Fatal("expected pesquisa update call in regenerate link")
	}

	if err := uc.ValidateStatusTransition("Arquivada", "Ativa"); err == nil {
		t.Fatal("expected invalid status transition error")
	}
}

func TestPesquisaUseCaseDeleteAndAccessValidations(t *testing.T) {
	pesquisaRepo := &testutils.MockPesquisaRepository{}
	empresaRepo := &testutils.MockEmpresaRepository{}
	setorRepo := &testutils.MockSetorRepository{}
	dashboardRepo := &testutils.MockDashboardRepository{}
	logRepo := &testutils.MockLogAuditoriaRepository{}

	pesquisaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Pesquisa, error) {
		if id == 1 {
			return &entity.Pesquisa{ID: 1, Status: "Ativa", Titulo: "ativa"}, nil
		}
		return &entity.Pesquisa{ID: id, Status: "Arquivada", Titulo: "arquivada"}, nil
	}
	deleted := false
	pesquisaRepo.DeleteFunc = func(ctx context.Context, id int) error {
		deleted = true
		return nil
	}

	uc := NewPesquisaUseCase(pesquisaRepo, empresaRepo, setorRepo, dashboardRepo, logRepo)
	if err := uc.Delete(context.Background(), 1, 10, "127.0.0.1"); err != nil {
		t.Fatalf("unexpected delete error for active survey: %v", err)
	}
	if !deleted {
		t.Fatal("expected delete repository call for active survey")
	}

	deleted = false
	if err := uc.Delete(context.Background(), 2, 10, "127.0.0.1"); err != nil {
		t.Fatalf("unexpected delete error: %v", err)
	}
	if !deleted {
		t.Fatal("expected delete repository call")
	}

	now := time.Now()
	if err := uc.ValidateAccess(&entity.Pesquisa{Status: "Rascunho"}); err == nil {
		t.Fatal("expected inactive access error")
	}
	if err := uc.ValidateAccess(&entity.Pesquisa{Status: "Ativa", DataAbertura: ptrTime(now.Add(time.Hour))}); err == nil {
		t.Fatal("expected not-opened-yet error")
	}
	if err := uc.ValidateAccess(&entity.Pesquisa{Status: "Ativa", DataFechamento: ptrTime(now.Add(-time.Hour))}); err == nil {
		t.Fatal("expected closed survey error")
	}

	if err := uc.ValidatePesquisaDates(ptrTime(now), ptrTime(now.Add(366*24*time.Hour))); err == nil {
		t.Fatal("expected max period validation error")
	}
	if _, err := uc.GetByLinkAcesso(context.Background(), ""); err == nil {
		t.Fatal("expected required link validation error")
	}
}

func TestPerguntaUseCaseCoreFlows(t *testing.T) {
	perguntaRepo := &testutils.MockPerguntaRepository{}
	respostaRepo := &testutils.MockRespostaRepository{}
	pesquisaRepo := &testutils.MockPesquisaRepository{}
	logRepo := &testutils.MockLogAuditoriaRepository{}

	pesquisaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Pesquisa, error) {
		return &entity.Pesquisa{ID: id, Titulo: "Pesquisa P", Status: "Rascunho"}, nil
	}
	perguntaRepo.ListByPesquisaFunc = func(ctx context.Context, pesquisaID int) ([]*entity.Pergunta, error) {
		return []*entity.Pergunta{{ID: 1, IDPesquisa: pesquisaID}, {ID: 2, IDPesquisa: pesquisaID}}, nil
	}
	created := false
	perguntaRepo.CreateFunc = func(ctx context.Context, p *entity.Pergunta) error {
		created = true
		p.ID = 50
		return nil
	}
	perguntaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Pergunta, error) {
		return &entity.Pergunta{ID: id, IDPesquisa: 9, TextoPergunta: "Q", TipoPergunta: "MultiplaEscolha"}, nil
	}
	updateOrderCalls := 0
	perguntaRepo.UpdateOrdemFunc = func(ctx context.Context, perguntaID int, novaOrdem int) error {
		updateOrderCalls++
		return nil
	}
	respostaRepo.CountByPerguntaFunc = func(ctx context.Context, perguntaID int) (int, error) {
		return 3, nil
	}
	respostaRepo.GetAggregatedByPerguntaFunc = func(ctx context.Context, perguntaID int) (map[string]int, error) {
		return map[string]int{"A": 2, "B": 1}, nil
	}

	uc := NewPerguntaUseCase(perguntaRepo, respostaRepo, pesquisaRepo, logRepo)
	p := &entity.Pergunta{IDPesquisa: 9, TextoPergunta: "Como avalia?", TipoPergunta: "MultiplaEscolha"}

	if err := uc.Create(context.Background(), p, 1, "127.0.0.1"); err != nil {
		t.Fatalf("unexpected pergunta create error: %v", err)
	}
	if !created {
		t.Fatal("expected pergunta create call")
	}
	if p.OrdemExibicao != 3 {
		t.Fatalf("expected auto order 3, got %d", p.OrdemExibicao)
	}

	if err := uc.ReorderPerguntas(context.Background(), 9, []int{1, 2}, 1, "127.0.0.1"); err != nil {
		t.Fatalf("unexpected reorder error: %v", err)
	}
	if updateOrderCalls != 2 {
		t.Fatalf("expected 2 reorder calls, got %d", updateOrderCalls)
	}

	stats, err := uc.GetPerguntasWithStats(context.Background(), 9)
	if err != nil {
		t.Fatalf("unexpected stats error: %v", err)
	}
	if len(stats) != 2 {
		t.Fatalf("expected stats for 2 perguntas, got %d", len(stats))
	}

	if got := getMostFrequentOption(map[string]int{"x": 1, "y": 3}); got != "y" {
		t.Fatalf("unexpected most frequent option: %s", got)
	}
	if avg := calculateAverage(map[string]int{"2": 1, "4": 1}); avg <= 0 {
		t.Fatalf("expected positive average, got %f", avg)
	}
}

func TestPerguntaUseCaseValidationErrors(t *testing.T) {
	perguntaRepo := &testutils.MockPerguntaRepository{}
	respostaRepo := &testutils.MockRespostaRepository{}
	pesquisaRepo := &testutils.MockPesquisaRepository{}
	logRepo := &testutils.MockLogAuditoriaRepository{}

	pesquisaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Pesquisa, error) {
		return &entity.Pesquisa{ID: id, Status: "Ativa"}, nil
	}
	uc := NewPerguntaUseCase(perguntaRepo, respostaRepo, pesquisaRepo, logRepo)

	err := uc.Create(context.Background(), &entity.Pergunta{IDPesquisa: 1, TextoPergunta: "Q", TipoPergunta: "SimNao"}, 1, "127.0.0.1")
	if err == nil || !strings.Contains(err.Error(), "ativas ou concluídas") {
		t.Fatalf("expected active survey create rejection, got: %v", err)
	}
}

func ptrTime(t time.Time) *time.Time {
	return &t
}
