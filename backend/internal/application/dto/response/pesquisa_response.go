// Package response contém structs usadas para enviar dados da API como respostas.
// PesquisaResponse representa a estrutura de resposta detalhada de uma pesquisa.
package response

import "time"

// PesquisaResponse retorna informações completas sobre uma pesquisa, incluindo
// dados de setor, administrador, perguntas e métricas de participação.
type PesquisaResponse struct {
	ID                   int                           `json:"id_pesquisa" example:"10"`                                                                                 // ID único da pesquisa
	IDEmpresa            int                           `json:"id_empresa" example:"1"`                                                                                   // ID da empresa associada
	IDSetor              int                           `json:"id_setor" example:"2"`                                                                                     // ID do setor associado
	Titulo               string                        `json:"titulo" example:"Pesquisa de Clima 2026"`                                                                  // Título da pesquisa
	Descricao            string                        `json:"descricao" example:"Levantamento anual de clima"`                                                          // Descrição da pesquisa
	DataCriacao          time.Time                     `json:"data_criacao" swaggertype:"string" example:"2026-01-01T09:00:00Z"`                                         // Data de criação da pesquisa
	DataAbertura         *time.Time                    `json:"data_abertura" swaggertype:"string" example:"2026-01-10T09:00:00Z"`                                        // Data de abertura da pesquisa, opcional
	DataFechamento       *time.Time                    `json:"data_fechamento" swaggertype:"string" example:"2026-01-31T23:59:59Z"`                                      // Data de fechamento da pesquisa, opcional
	Status               string                        `json:"status" example:"Ativa"`                                                                                   // Status da pesquisa (Rascunho, Ativa, Concluída, Arquivada)
	LinkAcesso           string                        `json:"link_acesso" example:"abc123xyz"`                                                                          // Link de acesso à pesquisa
	QRCodePath           string                        `json:"qrcode_path" example:"/uploads/qrcodes/abc123xyz.png"`                                                     // Caminho para QR Code da pesquisa
	Anonimato            bool                          `json:"anonimato" example:"true"`                                                                                 // Indica se a pesquisa é anônima
	IDCiclo              *int                          `json:"id_ciclo,omitempty" example:"1"`                                                                           // ID do ciclo de avaliação, opcional
	TotalPerguntas       int                           `json:"total_perguntas,omitempty" example:"20"`                                                                   // Número total de perguntas, opcional
	TotalRespostas       int                           `json:"total_respostas,omitempty" example:"300"`                                                                  // Número total de respostas, opcional
	TaxaParticipacao     float64                       `json:"taxa_participacao,omitempty" example:"75.0"`                                                               // Taxa média de participação, opcional
	UsuarioAdministrador *UsuarioAdministradorResponse `json:"usuario_administrador,omitempty" example:"{\"id_user_admin\":1,\"nome_admin\":\"Joao Silva\"}"`            // Informações do administrador da pesquisa, opcional
	Setor                *SetorResponse                `json:"setor,omitempty" example:"{\"id_setor\":2,\"nome_setor\":\"RH\"}"`                                         // Informações do setor da pesquisa, opcional
	Perguntas            []PerguntaResponse            `json:"perguntas,omitempty" example:"[{\"id_pergunta\":15,\"texto_pergunta\":\"Como você avalia o ambiente?\"}]"` // Lista de perguntas da pesquisa, opcional
}
