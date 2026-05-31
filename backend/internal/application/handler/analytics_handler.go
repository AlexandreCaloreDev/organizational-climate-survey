package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"organizational-climate-survey/backend/internal/application/dto/response"
	"organizational-climate-survey/backend/internal/domain/usecase"
	"github.com/gorilla/mux"
)

type AnalyticsHandler struct {
	analyticsUC *usecase.AnalyticsUseCase
}

func NewAnalyticsHandler(analyticsUC *usecase.AnalyticsUseCase) *AnalyticsHandler {
	return &AnalyticsHandler{analyticsUC: analyticsUC}
}

func (h *AnalyticsHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/analytics", h.GetAnalyticsReport).Methods("GET")
}

// GetAnalyticsReport gera o relatório analítico (Cenário A ou B) com base nos filtros
// @Summary Obtém dados para o painel de Analytics
// @Description Retorna o Relatório Analítico de Riscos e Comportamentos (Heatmap, Radar, KPI, Evolução)
// @Tags analytics
// @Accept json
// @Produce json
// @Param ciclo query string true "Ciclo de Avaliação (Ex: 2026.1)"
// @Param id_setor query int false "ID do Setor para o Cenário B (Visão Isolada)"
// @Success 200 {object} response.RelatorioAnalyticsResponse
// @Failure 400 {object} map[string]interface{} "Parâmetros inválidos"
// @Failure 500 {object} map[string]interface{} "Erro interno no servidor"
// @Router /api/v1/analytics [get]
func (h *AnalyticsHandler) GetAnalyticsReport(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Padrão de extração do middleware de autenticação via Context
	idEmpresaVal := r.Context().Value("empresa_id")
	if idEmpresaVal == nil {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "Acesso não autorizado ou empresa não identificada"}`))
		return
	}
	idEmpresa := idEmpresaVal.(int)

	ciclo := r.URL.Query().Get("ciclo")
	if ciclo == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "Parâmetro 'ciclo' é obrigatório"}`))
		return
	}

	var req response.AnalyticsFilterRequest
	req.IDEmpresa = idEmpresa
	req.Ciclo = &ciclo

	idSetorStr := r.URL.Query().Get("id_setor")
	if idSetorStr != "" {
		idSetor, err := strconv.Atoi(idSetorStr)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(`{"error": "Parâmetro 'id_setor' inválido"}`))
			return
		}
		req.IDSetor = &idSetor
	}

	res, err := h.analyticsUC.GetAnalyticsReport(r.Context(), req)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}
