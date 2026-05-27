// Package handler implementa os controladores HTTP da aplicação.
// Processa requisições de submissão anônima de pesquisas.
package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"organizational-climate-survey/backend/internal/application/dto"
	"organizational-climate-survey/backend/internal/application/dto/response"
	"organizational-climate-survey/backend/internal/domain/usecase"
	"organizational-climate-survey/backend/pkg/logger"

	"github.com/gorilla/mux"
)

// SubmissaoHandler gerencia requisições HTTP relacionadas a submissões anônimas
type SubmissaoHandler struct {
	submissaoUseCase *usecase.SubmissaoPesquisaUseCase
	log              logger.Logger
}

// NewSubmissaoHandler cria nova instância do handler de submissões
func NewSubmissaoHandler(submissaoUseCase *usecase.SubmissaoPesquisaUseCase, log logger.Logger) *SubmissaoHandler {
	return &SubmissaoHandler{
		submissaoUseCase: submissaoUseCase,
		log:              log,
	}
}

// GenerateAccessToken gera token único para acesso anônimo à pesquisa
// POST /pesquisas/{pesquisa_id}/token
// @Summary Gerar token de acesso para pesquisa
// @Description Gera token temporário para submissão anônima de respostas.
// @Tags submissoes
// @Accept json
// @Produce json
// @Param pesquisa_id path int true "ID da pesquisa"
// @Param body body dto.GenerateTokenRequest false "Fingerprint opcional"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 404 {object} response.APIResponse
// @Failure 409 {object} response.APIResponse
// @Failure 429 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/pesquisas/{pesquisa_id}/token [post]
func (h *SubmissaoHandler) GenerateAccessToken(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pesquisaID, err := strconv.Atoi(vars["pesquisa_id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID da pesquisa inválido", "ID deve ser um número inteiro")
		return
	}

	var req dto.GenerateTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Body vazio é válido (fingerprint é opcional)
		req = dto.GenerateTokenRequest{}
	}

	// Extrair IP do cliente
	clientIP := h.getClientIP(r)

	// Gerar token
	token, expiresAt, err := h.submissaoUseCase.GenerateAccessTokenWithMetadata(
		r.Context(),
		pesquisaID,
		clientIP,
		req.Fingerprint,
		r.UserAgent(),
		r.Header.Get("Accept-Language"),
		req.Kiosk,
	)

	if err != nil {
		h.log.WithContext(r.Context()).Error("Erro ao gerar token pesquisa ID=%d: %v", pesquisaID, err)

		if strings.Contains(err.Error(), "não está ativa") {
			response.WriteError(w, http.StatusBadRequest, "Pesquisa inativa", err.Error())
			return
		}
		if strings.Contains(err.Error(), "não iniciou") || strings.Contains(err.Error(), "encerrado") {
			response.WriteError(w, http.StatusBadRequest, "Fora do período", err.Error())
			return
		}
		if strings.Contains(err.Error(), "limite de tentativas") {
			response.WriteError(w, http.StatusTooManyRequests, "Limite excedido", err.Error())
			return
		}
		if strings.Contains(err.Error(), "Você já respondeu esta pesquisa.") {
			response.WriteError(w, http.StatusConflict, "Submissão duplicada", "Você já respondeu esta pesquisa.")
			return
		}
		if strings.Contains(err.Error(), "não encontrada") {
			response.WriteError(w, http.StatusNotFound, "Pesquisa não encontrada", err.Error())
			return
		}

		response.WriteError(w, http.StatusInternalServerError, "Erro interno", "Erro ao gerar token de acesso")
		return
	}

	// Calcular tempo até expiração
	expiresIn := int(time.Until(expiresAt).Seconds())

	resp := response.GenerateTokenResponse{
		TokenAcesso: token,
		ExpiresAt:   expiresAt.Format(time.RFC3339),
		ExpiresIn:   expiresIn,
	}

	h.log.WithContext(r.Context()).Info("Token gerado para pesquisa ID=%d, expira em %d segundos", pesquisaID, expiresIn)
	response.WriteSuccess(w, http.StatusOK, "Token gerado com sucesso", resp)
}

// GetSubmissionStats retorna estatísticas de submissões de uma pesquisa
// GET /pesquisas/{pesquisa_id}/submissions/stats
// @Summary Obter estatísticas de submissões
// @Tags submissoes
// @Produce json
// @Security BearerAuth
// @Param pesquisa_id path int true "ID da pesquisa"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 404 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/pesquisas/{pesquisa_id}/submissions/stats [get]
func (h *SubmissaoHandler) GetSubmissionStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pesquisaID, err := strconv.Atoi(vars["pesquisa_id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID da pesquisa inválido", "ID deve ser um número inteiro")
		return
	}

	stats, err := h.submissaoUseCase.GetSubmissionStats(r.Context(), pesquisaID)
	if err != nil {
		h.log.WithContext(r.Context()).Error("Erro ao buscar stats pesquisa ID=%d: %v", pesquisaID, err)

		if strings.Contains(err.Error(), "não encontrada") {
			response.WriteError(w, http.StatusNotFound, "Pesquisa não encontrada", err.Error())
			return
		}

		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	response.WriteSuccess(w, http.StatusOK, "Estatísticas obtidas com sucesso", stats)
}

// getClientIP extrai endereço IP do cliente considerando proxies
func (h *SubmissaoHandler) getClientIP(r *http.Request) string {
	// Tentar X-Forwarded-For primeiro (proxy/load balancer)
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		// Pegar primeiro IP da lista (cliente original)
		return strings.Split(ip, ",")[0]
	}

	// Tentar X-Real-IP
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}

	// Fallback para RemoteAddr
	return strings.Split(r.RemoteAddr, ":")[0]
}

// RegisterPublicRoutes registra rotas publicas de submissao.
func (h *SubmissaoHandler) RegisterPublicRoutes(router *mux.Router) {
	router.HandleFunc("/pesquisas/{pesquisa_id:[0-9]+}/token", h.GenerateAccessToken).Methods("POST")
}

// RegisterProtectedRoutes registra rotas protegidas de submissao.
func (h *SubmissaoHandler) RegisterProtectedRoutes(router *mux.Router) {
	router.HandleFunc("/pesquisas/{pesquisa_id:[0-9]+}/submissions/stats", h.GetSubmissionStats).Methods("GET")
}

// RegisterRoutes mantem compatibilidade com chamadas existentes.
func (h *SubmissaoHandler) RegisterRoutes(router *mux.Router) {
	h.RegisterPublicRoutes(router)
	h.RegisterProtectedRoutes(router)
}
