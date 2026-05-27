package usecase

import (
	"context"
	"strings"
	"testing"
	"time"

	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/testutils"
	"organizational-climate-survey/backend/pkg/crypto"
)

func TestRespostaUseCaseAdditionalFlows(t *testing.T) {
	subRepo := &testutils.MockSubmissaoPesquisaRepository{}
	perguntaRepo := &testutils.MockPerguntaRepository{}
	pesquisaRepo := &testutils.MockPesquisaRepository{}
	respostaRepo := &testutils.MockRespostaRepository{}

	perguntaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Pergunta, error) {
		switch id {
		case 1:
			return &entity.Pergunta{ID: 1, IDPesquisa: 10, TipoPergunta: "SimNao", TextoPergunta: "Gostou?"}, nil
		case 2:
			return &entity.Pergunta{ID: 2, IDPesquisa: 10, TipoPergunta: "EscalaNumerica", TextoPergunta: "Nota"}, nil
		case 3:
			return &entity.Pergunta{ID: 3, IDPesquisa: 10, TipoPergunta: "MultiplaEscolha", TextoPergunta: "Escolha"}, nil
		default:
			return &entity.Pergunta{ID: id, IDPesquisa: 10, TipoPergunta: "RespostaAberta", TextoPergunta: "Comentário"}, nil
		}
	}
	pesquisaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Pesquisa, error) {
		return &entity.Pesquisa{ID: id, Status: "Concluída"}, nil
	}
	respostaRepo.CountByPesquisaFunc = func(ctx context.Context, pesquisaID int) (int, error) { return 7, nil }
	respostaRepo.CountByPerguntaFunc = func(ctx context.Context, perguntaID int) (int, error) { return 4, nil }
	respostaRepo.GetAggregatedByPerguntaFunc = func(ctx context.Context, perguntaID int) (map[string]int, error) {
		return map[string]int{"Sim": 3, "Não": 1}, nil
	}
	respostaRepo.GetAggregatedByPesquisaFunc = func(ctx context.Context, pesquisaID int) (map[int]map[string]int, error) {
		return map[int]map[string]int{1: {"Sim": 3, "Não": 1}}, nil
	}
	respostaRepo.GetResponsesByDateRangeFunc = func(ctx context.Context, pesquisaID int, startDate, endDate string) ([]*entity.Resposta, error) {
		return []*entity.Resposta{{ID: 1, IDPergunta: 1, ValorResposta: "Sim"}}, nil
	}
	subRepo.AnonymizePersonalDataFunc = func(ctx context.Context, id int, token string) error { return nil }

	_, respUC := buildUseCasesForRespostaTests(subRepo, perguntaRepo, pesquisaRepo, respostaRepo)

	if err := respUC.ValidateResposta(&entity.Resposta{IDPergunta: 1, IDSubmissao: 1, ValorResposta: "Sim"}); err != nil {
		t.Fatalf("unexpected resposta validation error: %v", err)
	}
	if err := respUC.ValidateResponseValue(context.Background(), 1, "Talvez"); err == nil {
		t.Fatal("expected SimNao validation error")
	}
	if err := respUC.ValidateResponseValue(context.Background(), 2, "8"); err != nil {
		t.Fatalf("unexpected EscalaNumerica validation error: %v", err)
	}
	if err := respUC.ValidateResponseValue(context.Background(), 3, "A"); err != nil {
		t.Fatalf("unexpected MultiplaEscolha validation error: %v", err)
	}
	if err := respUC.ValidateResponseValue(context.Background(), 4, strings.Repeat("a", 1001)); err == nil {
		t.Fatal("expected RespostaAberta max size validation error")
	}

	if _, err := respUC.CountByPesquisa(context.Background(), 10); err != nil {
		t.Fatalf("unexpected count by pesquisa error: %v", err)
	}
	if _, err := respUC.CountByPergunta(context.Background(), 1); err != nil {
		t.Fatalf("unexpected count by pergunta error: %v", err)
	}
	if _, err := respUC.GetAggregatedByPergunta(context.Background(), 1); err != nil {
		t.Fatalf("unexpected aggregated by pergunta error: %v", err)
	}
	if _, err := respUC.GetAggregatedByPesquisa(context.Background(), 10); err != nil {
		t.Fatalf("unexpected aggregated by pesquisa error: %v", err)
	}
	if _, err := respUC.GetResponsesByDateRange(context.Background(), 10, "2024-01-01", "2024-01-02"); err != nil {
		t.Fatalf("unexpected responses by date range error: %v", err)
	}
	if _, err := respUC.GetStatisticsByPergunta(context.Background(), 1); err != nil {
		t.Fatalf("unexpected question statistics error: %v", err)
	}

	if err := respUC.DeletePersonalDataBySubmissao(context.Background(), 10, 1, "LGPD"); err != nil {
		t.Fatalf("unexpected anonymize-by-submission error: %v", err)
	}
	if err := respUC.DeletePersonalDataBySubmissao(context.Background(), 10, 1, ""); err == nil {
		t.Fatal("expected motivo obrigatório error")
	}
}

func TestSubmissaoUseCaseAdditionalFlows(t *testing.T) {
	repo := &testutils.MockSubmissaoPesquisaRepository{}
	pesquisaRepo := &testutils.MockPesquisaRepository{}
	cryptoSvc := crypto.NewDefaultCryptoService()

	pesquisaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Pesquisa, error) {
		return &entity.Pesquisa{ID: id, Status: "Ativa"}, nil
	}
	repo.CountByPesquisaAndIPHashFunc = func(ctx context.Context, pesquisaID int, ipHash string, since time.Time) (int, error) {
		return 0, nil
	}
	repo.CountByPesquisaAndFingerprintHashFunc = func(ctx context.Context, pesquisaID int, fingerprintHash string, since time.Time) (int, error) {
		return 1, nil
	}

	uc := NewSubmissaoPesquisaUseCase(repo, pesquisaRepo, cryptoSvc, "salt")
	if _, _, err := uc.GenerateAccessTokenWithMetadata(context.Background(), 1, "10.0.0.1", "fp", "ua", "pt-BR", false); err == nil {
		t.Fatal("expected duplicate submission protection error")
	}

	repo.GetByTokenFunc = func(ctx context.Context, token string) (*entity.SubmissaoPesquisa, error) {
		return &entity.SubmissaoPesquisa{ID: 8, IDPesquisa: 1, Status: "pendente", DataExpiracao: time.Now().Add(time.Hour)}, nil
	}
	pesquisaRepo.GetByIDFunc = func(ctx context.Context, id int) (*entity.Pesquisa, error) {
		return &entity.Pesquisa{ID: id, Status: "Arquivada"}, nil
	}
	if _, err := uc.ValidateToken(context.Background(), "token"); err == nil {
		t.Fatal("expected inactive survey validation error")
	}

	if err := uc.CompleteSubmission(context.Background(), 0); err == nil {
		t.Fatal("expected invalid submission ID error")
	}
	repo.MarkAsCompletedFunc = func(ctx context.Context, id int) error { return nil }
	if err := uc.CompleteSubmission(context.Background(), 9); err != nil {
		t.Fatalf("unexpected complete submission error: %v", err)
	}

	repo.DeleteExpiredFunc = func(ctx context.Context) (int, error) { return 4, nil }
	if count, err := uc.CleanupExpired(context.Background()); err != nil || count != 4 {
		t.Fatalf("unexpected cleanup result: count=%d err=%v", count, err)
	}

	repo.AnonymizePersonalDataFunc = func(ctx context.Context, id int, token string) error { return nil }
	if err := uc.AnonymizePersonalData(context.Background(), 9); err != nil {
		t.Fatalf("unexpected anonymize personal data error: %v", err)
	}

	if rate := calculateCompletionRate(2, 5); rate <= 0 {
		t.Fatalf("expected positive completion rate, got %f", rate)
	}

	uc.SetRateLimit(5)
	uc.SetTokenTTL(2 * time.Hour)
}
