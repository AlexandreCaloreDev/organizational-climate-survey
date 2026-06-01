// Package handler implementa os controladores HTTP da aplicação.
// Processa requisições, valida entrada e coordena a execução de casos de uso.
package handler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"organizational-climate-survey/backend/internal/application/dto"
	"organizational-climate-survey/backend/internal/application/dto/response"
	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/domain/usecase"
	"organizational-climate-survey/backend/pkg/logger"

	"github.com/gorilla/mux"
	"github.com/skip2/go-qrcode"
)

// PesquisaHandler gerencia requisições HTTP relacionadas a pesquisas de clima
type PesquisaHandler struct {
	pesquisaUseCase *usecase.PesquisaUseCase
	log             logger.Logger
}

// PesquisaStatusUpdateRequest define payload para atualização de status da pesquisa.
type PesquisaStatusUpdateRequest struct {
	Status string `json:"status" example:"Ativa"`
}

// NewPesquisaHandler cria nova instância do handler de pesquisas
func NewPesquisaHandler(pesquisaUseCase *usecase.PesquisaUseCase, log logger.Logger) *PesquisaHandler {
	return &PesquisaHandler{
		pesquisaUseCase: pesquisaUseCase,
		log:             log,
	}
}

// CreatePesquisa cria nova pesquisa de clima no sistema
// @Summary Criar pesquisa
// @Tags pesquisas
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body dto.PesquisaCreateRequest true "Dados da pesquisa"
// @Success 201 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/pesquisas [post]
func (h *PesquisaHandler) CreatePesquisa(w http.ResponseWriter, r *http.Request) {
	var req dto.PesquisaCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.log.WithContext(r.Context()).Warn("Decode erro: %v", err)
		response.WriteError(w, http.StatusBadRequest, "Dados inválidos", err.Error())
		return
	}
	if err := h.validatePesquisaCreateRequest(&req); err != nil {
		h.log.WithContext(r.Context()).Info("Validação falhou: %v", err)
		response.WriteError(w, http.StatusBadRequest, "Validação falhou", err.Error())
		return
	}
	pesquisa, err := req.ToEntity()
	if err != nil {
		h.log.WithContext(r.Context()).Warn("Conversão entidade erro: %v", err)
		response.WriteError(w, http.StatusBadRequest, "Erro de conversão", err.Error())
		return
	}
	userAdminID := h.getUserAdminIDFromContext(r)
	clientIP := h.getClientIP(r)
	if err := h.pesquisaUseCase.Create(r.Context(), pesquisa, userAdminID, clientIP); err != nil {
		h.log.WithFields(map[string]interface{}{"user_admin_id": userAdminID, "client_ip": clientIP}).Error("Erro ao criar pesquisa: %v", err)
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}
	h.log.WithFields(map[string]interface{}{"pesquisa_id": pesquisa.ID, "user_admin_id": userAdminID}).Info("Pesquisa criada com sucesso")
	response.WriteSuccess(w, http.StatusCreated, "Pesquisa criada com sucesso", h.toPesquisaResponse(pesquisa))
}

// GetPesquisa busca pesquisa de clima por ID
// @Summary Buscar pesquisa por ID
// @Tags pesquisas
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID da pesquisa"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 404 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/pesquisas/{id} [get]
func (h *PesquisaHandler) GetPesquisa(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID inválido", "ID deve ser um número inteiro")
		return
	}

	pesquisa, err := h.pesquisaUseCase.GetByID(r.Context(), id)
	if err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			response.WriteError(w, http.StatusNotFound, "Pesquisa não encontrada", err.Error())
			return
		}
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	pesquisaResponse := h.toPesquisaResponse(pesquisa)
	response.WriteSuccess(w, http.StatusOK, "Pesquisa encontrada", pesquisaResponse)
}

// GetPesquisaByLink busca pesquisa de clima por link de acesso público
// @Summary Buscar pesquisa por link
// @Tags pesquisas
// @Produce json
// @Security BearerAuth
// @Param link path string true "Link de acesso da pesquisa"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 404 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/pesquisas/link/{link} [get]
func (h *PesquisaHandler) GetPesquisaByLink(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	link := vars["link"]

	if strings.TrimSpace(link) == "" {
		response.WriteError(w, http.StatusBadRequest, "Link inválido", "Link de acesso é obrigatório")
		return
	}

	pesquisa, err := h.pesquisaUseCase.GetByLinkAcesso(r.Context(), link)
	if err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			response.WriteError(w, http.StatusNotFound, "Pesquisa não encontrada", err.Error())
			return
		}
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	pesquisaResponse := h.toPesquisaResponse(pesquisa)
	response.WriteSuccess(w, http.StatusOK, "Pesquisa encontrada", pesquisaResponse)
}

// ListPesquisasByEmpresa lista pesquisas de empresa com filtro opcional de status
// @Summary Listar pesquisas por empresa
// @Tags pesquisas
// @Produce json
// @Security BearerAuth
// @Param empresa_id path int true "ID da empresa"
// @Param status query string false "Status da pesquisa"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/empresas/{empresa_id}/pesquisas [get]
func (h *PesquisaHandler) ListPesquisasByEmpresa(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	empresaID, err := strconv.Atoi(vars["empresa_id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID da empresa inválido", "ID deve ser um número inteiro")
		return
	}

	status := r.URL.Query().Get("status")

	var pesquisas []*entity.Pesquisa

	if status != "" {
		pesquisas, err = h.pesquisaUseCase.ListByStatus(r.Context(), empresaID, status)
	} else {
		pesquisas, err = h.pesquisaUseCase.ListByEmpresa(r.Context(), empresaID)
	}

	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	// Converter entidades para DTOs de resposta
	pesquisasResponse := make([]interface{}, len(pesquisas))
	for i, pesquisa := range pesquisas {
		pesquisasResponse[i] = h.toPesquisaResponse(pesquisa)
	}

	response.WriteSuccess(w, http.StatusOK, "Pesquisas listadas com sucesso", pesquisasResponse)
}

// ListPesquisasBySetor lista todas as pesquisas de um setor específico
// @Summary Listar pesquisas por setor
// @Tags pesquisas
// @Produce json
// @Security BearerAuth
// @Param setor_id path int true "ID do setor"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/setores/{setor_id}/pesquisas [get]
func (h *PesquisaHandler) ListPesquisasBySetor(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	setorID, err := strconv.Atoi(vars["setor_id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID do setor inválido", "ID deve ser um número inteiro")
		return
	}

	pesquisas, err := h.pesquisaUseCase.ListBySetor(r.Context(), setorID)
	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	// Converter entidades para DTOs de resposta
	pesquisasResponse := make([]interface{}, len(pesquisas))
	for i, pesquisa := range pesquisas {
		pesquisasResponse[i] = h.toPesquisaResponse(pesquisa)
	}

	response.WriteSuccess(w, http.StatusOK, "Pesquisas do setor listadas com sucesso", pesquisasResponse)
}

// ListPesquisasActive lista todas as pesquisas ativas de uma empresa
// @Summary Listar pesquisas ativas por empresa
// @Tags pesquisas
// @Produce json
// @Security BearerAuth
// @Param empresa_id path int true "ID da empresa"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/empresas/{empresa_id}/pesquisas/active [get]
func (h *PesquisaHandler) ListPesquisasActive(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	empresaID, err := strconv.Atoi(vars["empresa_id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID da empresa inválido", "ID deve ser um número inteiro")
		return
	}

	pesquisas, err := h.pesquisaUseCase.ListActive(r.Context(), empresaID)
	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	// Converter entidades para DTOs de resposta
	pesquisasResponse := make([]interface{}, len(pesquisas))
	for i, pesquisa := range pesquisas {
		pesquisasResponse[i] = h.toPesquisaResponse(pesquisa)
	}

	response.WriteSuccess(w, http.StatusOK, "Pesquisas ativas listadas com sucesso", pesquisasResponse)
}

// UpdatePesquisa atualiza dados de pesquisa de clima existente
// @Summary Atualizar pesquisa
// @Tags pesquisas
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID da pesquisa"
// @Param body body dto.PesquisaUpdateRequest true "Dados para atualização"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 404 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/pesquisas/{id} [put]
func (h *PesquisaHandler) UpdatePesquisa(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID inválido", "ID deve ser um número inteiro")
		return
	}

	var req dto.PesquisaUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.WriteError(w, http.StatusBadRequest, "Dados inválidos", err.Error())
		return
	}

	// Buscar pesquisa existente
	pesquisa, err := h.pesquisaUseCase.GetByID(r.Context(), id)
	if err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			response.WriteError(w, http.StatusNotFound, "Pesquisa não encontrada", err.Error())
			return
		}
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	// Aplicar alterações parciais à entidade
	if err := req.ApplyToEntity(pesquisa); err != nil {
		response.WriteError(w, http.StatusBadRequest, "Erro na aplicação dos dados", err.Error())
		return
	}

	userAdminID := h.getUserAdminIDFromContext(r)
	clientIP := h.getClientIP(r)

	if err := h.pesquisaUseCase.Update(r.Context(), pesquisa, userAdminID, clientIP); err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	pesquisaResponse := h.toPesquisaResponse(pesquisa)
	response.WriteSuccess(w, http.StatusOK, "Pesquisa atualizada com sucesso", pesquisaResponse)
}

// UpdateStatusPesquisa atualiza apenas status de pesquisa existente
// @Summary Atualizar status da pesquisa
// @Tags pesquisas
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID da pesquisa"
// @Param body body PesquisaStatusUpdateRequest true "Novo status da pesquisa"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 404 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/pesquisas/{id}/status [put]
func (h *PesquisaHandler) UpdateStatusPesquisa(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID inválido", "ID deve ser um número inteiro")
		return
	}

	var req PesquisaStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.WriteError(w, http.StatusBadRequest, "Dados inválidos", err.Error())
		return
	}

	// Validar status contra valores permitidos
	if !h.isValidPesquisaStatus(req.Status) {
		response.WriteError(w, http.StatusBadRequest, "Status inválido", "Status deve ser: Rascunho, Ativa, Concluída ou Arquivada")
		return
	}

	userAdminID := h.getUserAdminIDFromContext(r)
	clientIP := h.getClientIP(r)

	if err := h.pesquisaUseCase.UpdateStatus(r.Context(), id, req.Status, userAdminID, clientIP); err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			response.WriteError(w, http.StatusNotFound, "Pesquisa não encontrada", err.Error())
			return
		}
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	response.WriteSuccess(w, http.StatusOK, "Status da pesquisa atualizado com sucesso", nil)
}

// DeletePesquisa remove pesquisa de clima do sistema
// @Summary Remover pesquisa
// @Tags pesquisas
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID da pesquisa"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 404 {object} response.APIResponse
// @Failure 409 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/pesquisas/{id} [delete]
func (h *PesquisaHandler) DeletePesquisa(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID inválido", "ID deve ser um número inteiro")
		return
	}

	userAdminID := h.getUserAdminIDFromContext(r)
	clientIP := h.getClientIP(r)

	if err := h.pesquisaUseCase.Delete(r.Context(), id, userAdminID, clientIP); err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			response.WriteError(w, http.StatusNotFound, "Pesquisa não encontrada", err.Error())
			return
		}
		if strings.Contains(err.Error(), "possui") && strings.Contains(err.Error(), "vinculados") {
			response.WriteError(w, http.StatusConflict, "Pesquisa possui dependências", err.Error())
			return
		}
		if strings.Contains(err.Error(), "não é possível") {
			response.WriteError(w, http.StatusConflict, "Não é possível excluir a pesquisa", err.Error())
			return
		}
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	response.WriteSuccess(w, http.StatusOK, "Pesquisa deletada com sucesso", nil)
}

// GenerateQRCode gera código QR para acesso público à pesquisa
// @Summary Gerar QR Code da pesquisa
// @Tags pesquisas
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID da pesquisa"
// @Success 200 {object} response.APIResponse
// @Failure 400 {object} response.APIResponse
// @Failure 404 {object} response.APIResponse
// @Failure 500 {object} response.APIResponse
// @Router /api/v1/pesquisas/{id}/qrcode [post]
func (h *PesquisaHandler) GenerateQRCode(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, "ID inválido", "ID deve ser um número inteiro")
		return
	}

	// Verificar existência da pesquisa
	pesquisa, err := h.pesquisaUseCase.GetByID(r.Context(), id)
	if err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			response.WriteError(w, http.StatusNotFound, "Pesquisa não encontrada", err.Error())
			return
		}
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	surveyURL := h.buildSurveyURL(r, pesquisa)
	qrPayload := surveyURL

	pngBytes, err := qrcode.Encode(qrPayload, qrcode.Medium, 256)
	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro ao gerar QR Code", err.Error())
		return
	}

	outputDir := strings.TrimSpace(os.Getenv("QRCODE_OUTPUT_DIR"))
	if outputDir == "" {
		outputDir = filepath.Join("uploads", "qrcodes")
	}
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro ao preparar diretório de QR Code", err.Error())
		return
	}

	fileName := fmt.Sprintf("%s.png", pesquisa.LinkAcesso)
	filePath := filepath.Join(outputDir, fileName)
	if err := os.WriteFile(filePath, pngBytes, 0o644); err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro ao salvar QR Code", err.Error())
		return
	}

	publicBasePath := strings.TrimSpace(os.Getenv("QRCODE_PUBLIC_BASE_PATH"))
	if publicBasePath == "" {
		publicBasePath = "/uploads/qrcodes"
	}
	if !strings.HasPrefix(publicBasePath, "/") {
		publicBasePath = "/" + publicBasePath
	}
	qrCodePath := strings.TrimRight(publicBasePath, "/") + "/" + fileName

	// Atualizar no banco
	pesquisa.QRCodePath = qrCodePath

	userAdminID := h.getUserAdminIDFromContext(r)
	clientIP := h.getClientIP(r)

	if err := h.pesquisaUseCase.Update(r.Context(), pesquisa, userAdminID, clientIP); err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro ao salvar QR Code", err.Error())
		return
	}

	qrResponse := map[string]string{
		"qr_code_path":   qrCodePath,
		"link_acesso":    pesquisa.LinkAcesso,
		"survey_url":     surveyURL,
		"qr_payload":     qrPayload,
		"qr_code_base64": base64.StdEncoding.EncodeToString(pngBytes),
	}

	response.WriteSuccess(w, http.StatusOK, "QR Code gerado com sucesso", qrResponse)
}

// validatePesquisaCreateRequest valida campos obrigatórios e regras de negócio para criação
func (h *PesquisaHandler) validatePesquisaCreateRequest(req *dto.PesquisaCreateRequest) error {
	if req.IDEmpresa <= 0 {
		return fmt.Errorf("ID da empresa é obrigatório")
	}
	if req.IDSetor <= 0 {
		return fmt.Errorf("ID do setor é obrigatório")
	}
	if strings.TrimSpace(req.Titulo) == "" {
		return fmt.Errorf("título da pesquisa é obrigatório")
	}
	if len(req.Titulo) < 3 {
		return fmt.Errorf("título deve ter pelo menos 3 caracteres")
	}
	if !h.isValidPesquisaStatus(req.Status) {
		return fmt.Errorf("status inválido")
	}
	return nil
}

// isValidPesquisaStatus verifica se status fornecido é válido
func (h *PesquisaHandler) isValidPesquisaStatus(status string) bool {
	validStatuses := []string{"Rascunho", "Ativa", "Concluída", "Arquivada"}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

// getUserAdminIDFromContext extrai ID do usuário administrativo do contexto da requisição
func (h *PesquisaHandler) getUserAdminIDFromContext(r *http.Request) int {
	if userID := r.Context().Value("user_admin_id"); userID != nil {
		if id, ok := userID.(int); ok {
			return id
		}
	}
	return 0
}

// getClientIP extrai endereço IP do cliente considerando proxies
func (h *PesquisaHandler) getClientIP(r *http.Request) string {
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.Split(ip, ",")[0]
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return r.RemoteAddr
}

// toPesquisaResponse converte entidade de domínio para DTO de resposta
func (h *PesquisaHandler) toPesquisaResponse(pesquisa *entity.Pesquisa) *response.PesquisaResponse {
	resp := &response.PesquisaResponse{
		ID:             pesquisa.ID,
		IDEmpresa:      pesquisa.IDEmpresa,
		IDSetor:        pesquisa.IDSetor,
		Titulo:         pesquisa.Titulo,
		Descricao:      pesquisa.Descricao,
		DataCriacao:    pesquisa.DataCriacao,
		DataAbertura:   pesquisa.DataAbertura,
		DataFechamento: pesquisa.DataFechamento,
		Status:         pesquisa.Status,
		LinkAcesso:     pesquisa.LinkAcesso,
		QRCodePath:     pesquisa.QRCodePath,
		Anonimato:      pesquisa.Anonimato,
		IDCiclo:        pesquisa.IDCiclo,
	}

	if pesquisa.Setor != nil {
		resp.Setor = &response.SetorResponse{
			ID:        pesquisa.Setor.ID,
			NomeSetor: pesquisa.Setor.NomeSetor,
			Descricao: pesquisa.Setor.Descricao,
		}
	}

	return resp
}

// RegisterRoutes registra todas as rotas HTTP do handler no roteador
func (h *PesquisaHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/pesquisas", h.CreatePesquisa).Methods("POST")
	router.HandleFunc("/pesquisas/{id:[0-9]+}", h.GetPesquisa).Methods("GET")
	router.HandleFunc("/pesquisas/{id:[0-9]+}", h.UpdatePesquisa).Methods("PUT")
	router.HandleFunc("/pesquisas/{id:[0-9]+}", h.DeletePesquisa).Methods("DELETE")
	router.HandleFunc("/pesquisas/{id:[0-9]+}/status", h.UpdateStatusPesquisa).Methods("PUT")
	router.HandleFunc("/pesquisas/{id:[0-9]+}/qrcode", h.GenerateQRCode).Methods("POST")
	router.HandleFunc("/pesquisas/link/{link}", h.GetPesquisaByLink).Methods("GET")
	router.HandleFunc("/empresas/{empresa_id:[0-9]+}/pesquisas", h.ListPesquisasByEmpresa).Methods("GET")
	router.HandleFunc("/empresas/{empresa_id:[0-9]+}/pesquisas/active", h.ListPesquisasActive).Methods("GET")
	router.HandleFunc("/setores/{setor_id:[0-9]+}/pesquisas", h.ListPesquisasBySetor).Methods("GET")
}

func (h *PesquisaHandler) buildSurveyURL(r *http.Request, pesquisa *entity.Pesquisa) string {
	baseURL := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if baseURL == "" {
		scheme := "http"
		if r.TLS != nil {
			scheme = "https"
		}
		baseURL = fmt.Sprintf("%s://%s", scheme, r.Host)
	}
	baseURL = strings.TrimRight(baseURL, "/")
	return fmt.Sprintf("%s/pesquisas/link/%s", baseURL, pesquisa.LinkAcesso)
}
