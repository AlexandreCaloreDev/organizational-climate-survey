package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"organizational-climate-survey/backend/internal/application/dto/response"
	"organizational-climate-survey/backend/internal/domain/entity"
	"organizational-climate-survey/backend/internal/domain/usecase"
	"organizational-climate-survey/backend/pkg/logger"

	"github.com/gorilla/mux"
)

type CicloHandler struct {
	useCase *usecase.CicloUseCase
	logger  logger.Logger
}

func NewCicloHandler(uc *usecase.CicloUseCase, log logger.Logger) *CicloHandler {
	return &CicloHandler{
		useCase: uc,
		logger:  log,
	}
}

func (h *CicloHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/ciclos", h.Create).Methods("POST")
	router.HandleFunc("/ciclos", h.List).Methods("GET")
	router.HandleFunc("/ciclos/{id:[0-9]+}", h.Update).Methods("PUT")
	router.HandleFunc("/ciclos/{id:[0-9]+}", h.Delete).Methods("DELETE")
}

func (h *CicloHandler) Create(w http.ResponseWriter, r *http.Request) {
	empresaIDStr := r.Context().Value("empresa_id").(string)
	empresaID, _ := strconv.Atoi(empresaIDStr)

	var req struct {
		Nome        string  `json:"nome"`
		Recorrencia *string `json:"recorrencia"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido", "")
		return
	}

	ciclo, err := h.useCase.Create(r.Context(), empresaID, req.Nome, req.Recorrencia)
	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	response.WriteSuccess(w, http.StatusCreated, "Ciclo criado com sucesso", ciclo)
}

func (h *CicloHandler) List(w http.ResponseWriter, r *http.Request) {
	empresaIDStr := r.Context().Value("empresa_id").(string)
	empresaID, _ := strconv.Atoi(empresaIDStr)

	ciclos, err := h.useCase.ListByEmpresa(r.Context(), empresaID)
	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	if ciclos == nil {
		ciclos = make([]entity.CicloAvaliacao, 0) // Para não retornar null no JSON
	}

	response.WriteSuccess(w, http.StatusOK, "Ciclos recuperados com sucesso", ciclos)
}

func (h *CicloHandler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.Atoi(vars["id"])

	var req struct {
		Nome        string  `json:"nome"`
		Recorrencia *string `json:"recorrencia"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.WriteError(w, http.StatusBadRequest, "Corpo da requisição inválido", "")
		return
	}

	err := h.useCase.Update(r.Context(), id, req.Nome, req.Recorrencia)
	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	response.WriteSuccess(w, http.StatusOK, "Ciclo atualizado com sucesso", nil)
}

func (h *CicloHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.Atoi(vars["id"])

	err := h.useCase.Delete(r.Context(), id)
	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "Erro interno", err.Error())
		return
	}

	response.WriteSuccess(w, http.StatusOK, "Ciclo removido com sucesso", nil)
}
