// Package entity define as entidades principais do domínio da aplicação.
// Fornece as estruturas de dados fundamentais do sistema de pesquisa de clima.
package entity

import "time"

// Pesquisa representa uma pesquisa de clima organizacional
type Pesquisa struct {
	ID                int        `json:"id_pesquisa" example:"10"`                                            // Identificador único da pesquisa
	IDEmpresa         int        `json:"id_empresa" example:"1"`                                              // ID da empresa responsável
	IDUserAdmin       int        `json:"id_user_admin" example:"1"`                                           // ID do administrador criador
	IDSetor           int        `json:"id_setor" example:"2"`                                                // ID do setor alvo
	Titulo            string     `json:"titulo" example:"Pesquisa de Clima 2026"`                             // Título da pesquisa
	Descricao         string     `json:"descricao" example:"Pesquisa anual de clima organizacional"`          // Descrição detalhada
	DataCriacao       time.Time  `json:"data_criacao" swaggertype:"string" example:"2026-01-01T09:00:00Z"`    // Data de criação
	DataAbertura      *time.Time `json:"data_abertura" swaggertype:"string" example:"2026-01-10T09:00:00Z"`   // Data de início opcional
	DataFechamento    *time.Time `json:"data_fechamento" swaggertype:"string" example:"2026-01-31T23:59:59Z"` // Data de término opcional
	Status            string     `json:"status" example:"Ativa"`                                              // Estado atual (Rascunho, Ativa, etc)
	LinkAcesso        string     `json:"link_acesso" example:"abc123xyz"`                                     // Link único para respostas
	QRCodePath        string     `json:"qrcode_path" example:"/uploads/qrcodes/abc123xyz.png"`                // Caminho do QR Code gerado
	ConfigRecorrencia *string    `json:"config_recorrencia" example:"mensal"`                                 // Configuração de recorrência
	Anonimato         bool       `json:"anonimato" example:"true"`                                            // Se respostas são anônimas
	IDCiclo           *int       `json:"id_ciclo,omitempty" example:"1"`                                      // ID do ciclo de avaliação

	// Relacionamentos (opcional, para carregamento sob demanda)
	Perguntas            []Pergunta            `json:"perguntas,omitempty" example:"[{\"id_pergunta\":15,\"texto_pergunta\":\"Como você avalia o ambiente?\"}]"` // Lista de perguntas
	UsuarioAdministrador *UsuarioAdministrador `json:"usuario_administrador,omitempty" example:"{\"id_user_admin\":1,\"nome_admin\":\"Joao Silva\"}"`            // Admin criador
	Setor                *Setor                `json:"setor,omitempty" example:"{\"id_setor\":2,\"nome_setor\":\"RH\"}"`                                         // Setor alvo
	Dashboard            *Dashboard            `json:"dashboard,omitempty" example:"{\"id_dashboard\":3,\"titulo\":\"Dashboard Clima RH\"}"`                     // Dashboard associado
}
