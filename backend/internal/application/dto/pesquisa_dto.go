// Package dto contém estruturas de transferência de dados (Data Transfer Objects)
// utilizadas para comunicação entre as camadas de entrada (ex: handlers HTTP) e o domínio.
// Este arquivo define os DTOs de criação e atualização da entidade Pesquisa.

package dto

import (
	"fmt"
	"organizational-climate-survey/backend/internal/domain/entity"
	"strings"
	"time"
)

// PesquisaCreateRequest representa os dados necessários para criar uma nova pesquisa.
// Inclui metadados da empresa, setor, configuração de recorrência e controle de datas.
type PesquisaCreateRequest struct {
	IDEmpresa         int     `json:"id_empresa" binding:"required,gt=0" example:"1"`                                     // Identificador da empresa (obrigatório)
	IDUserAdmin       int     `json:"id_user_admin" binding:"required,gt=0" example:"1"`                                  // Identificador do usuário administrador criador (obrigatório)
	IDSetor           int     `json:"id_setor" binding:"required,gt=0" example:"2"`                                       // Identificador do setor vinculado (obrigatório)
	Titulo            string  `json:"titulo" binding:"required,min=3,max=255" example:"Pesquisa de Clima 2026"`           // Título da pesquisa (obrigatório)
	Descricao         string  `json:"descricao" binding:"max=1000" example:"Avaliação anual de clima organizacional"`     // Descrição detalhada (opcional)
	Status            string  `json:"status" binding:"required,oneof=Rascunho Ativa Concluída Arquivada" example:"Ativa"` // Estado da pesquisa
	ConfigRecorrencia *string `json:"config_recorrencia,omitempty" example:"mensal"`                                      // Definição de recorrência automática (opcional)
	Anonimato         bool    `json:"anonimato" example:"true"`                                                           // Indica se as respostas são anônimas
	DataAbertura      *string `json:"data_abertura,omitempty" example:"2026-01-10T09:00:00Z"`                             // Data de início no formato RFC3339 (opcional)
	DataFechamento    *string `json:"data_fechamento,omitempty" example:"2026-01-31T23:59:59Z"`                           // Data de término no formato RFC3339 (opcional)
	IDCiclo           *int    `json:"id_ciclo,omitempty" example:"1"`                                                     // ID do ciclo de avaliação (opcional)
}

// PesquisaUpdateRequest representa os campos permitidos para atualização parcial de uma pesquisa existente.
type PesquisaUpdateRequest struct {
	Titulo            *string `json:"titulo,omitempty" binding:"omitempty,min=3,max=255" example:"Pulso Semanal"`                        // Novo título (opcional)
	Descricao         *string `json:"descricao,omitempty" binding:"omitempty,max=1000" example:"Levantamento rápido de bem-estar"`       // Nova descrição (opcional)
	Status            *string `json:"status,omitempty" binding:"omitempty,oneof=Rascunho Ativa Concluída Arquivada" example:"Concluída"` // Novo status (opcional)
	ConfigRecorrencia *string `json:"config_recorrencia,omitempty" example:"semanal"`                                                    // Atualização da configuração de recorrência (opcional)
	DataAbertura      *string `json:"data_abertura,omitempty" example:"2026-02-01T09:00:00Z"`                                            // Nova data de abertura no formato RFC3339 (opcional)
	DataFechamento    *string `json:"data_fechamento,omitempty" example:"2026-02-07T23:59:59Z"`                                          // Nova data de fechamento no formato RFC3339 (opcional)
	IDCiclo           *int    `json:"id_ciclo,omitempty" example:"1"`                                                                    // ID do ciclo de avaliação (opcional)
}

// ToEntity converte a requisição de criação em uma entidade de domínio Pesquisa,
// validando e parseando datas quando presentes.
func (r *PesquisaCreateRequest) ToEntity() (*entity.Pesquisa, error) {
	pesquisa := &entity.Pesquisa{
		IDEmpresa:         r.IDEmpresa,
		IDUserAdmin:       r.IDUserAdmin,
		IDSetor:           r.IDSetor,
		Titulo:            strings.TrimSpace(r.Titulo),
		Descricao:         strings.TrimSpace(r.Descricao),
		Status:            r.Status,
		ConfigRecorrencia: r.ConfigRecorrencia,
		Anonimato:         r.Anonimato,
		IDCiclo:           r.IDCiclo,
	}

	if r.DataAbertura != nil {
		t, err := time.Parse(time.RFC3339, *r.DataAbertura)
		if err != nil {
			return nil, fmt.Errorf("data_abertura inválida: %v", err)
		}
		pesquisa.DataAbertura = &t
	}

	if r.DataFechamento != nil {
		t, err := time.Parse(time.RFC3339, *r.DataFechamento)
		if err != nil {
			return nil, fmt.Errorf("data_fechamento inválida: %v", err)
		}
		pesquisa.DataFechamento = &t
	}

	return pesquisa, nil
}

// ApplyToEntity aplica os campos informados na requisição de atualização
// sobre uma instância existente da entidade Pesquisa.
func (r *PesquisaUpdateRequest) ApplyToEntity(pesquisa *entity.Pesquisa) error {
	if r.Titulo != nil {
		pesquisa.Titulo = strings.TrimSpace(*r.Titulo)
	}
	if r.Descricao != nil {
		pesquisa.Descricao = strings.TrimSpace(*r.Descricao)
	}
	if r.Status != nil {
		pesquisa.Status = *r.Status
	}
	if r.ConfigRecorrencia != nil {
		pesquisa.ConfigRecorrencia = r.ConfigRecorrencia
	}
	if r.IDCiclo != nil {
		pesquisa.IDCiclo = r.IDCiclo
	}

	if r.DataAbertura != nil {
		t, err := time.Parse(time.RFC3339, *r.DataAbertura)
		if err != nil {
			return fmt.Errorf("data_abertura inválida: %v", err)
		}
		pesquisa.DataAbertura = &t
	}

	if r.DataFechamento != nil {
		t, err := time.Parse(time.RFC3339, *r.DataFechamento)
		if err != nil {
			return fmt.Errorf("data_fechamento inválida: %v", err)
		}
		pesquisa.DataFechamento = &t
	}

	return nil
}
