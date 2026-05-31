package entity

import "time"

// CicloAvaliacao representa um período temporal onde pesquisas podem ser agrupadas
type CicloAvaliacao struct {
	ID              int       `json:"id_ciclo" example:"1"`
	IDEmpresa       int       `json:"id_empresa" example:"1"`
	Nome            string    `json:"nome" example:"Q1 2026"`
	Recorrencia     *string   `json:"recorrencia" example:"Trimestral"`
	DataCriacao     time.Time `json:"data_criacao" swaggertype:"string"`
	DataAtualizacao time.Time `json:"data_atualizacao" swaggertype:"string"`
}
