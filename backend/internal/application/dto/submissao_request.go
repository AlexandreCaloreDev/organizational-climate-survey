// Package dto define objetos de transferência de dados para submissões.
package dto

// GenerateTokenRequest representa requisição para gerar token de acesso à pesquisa
type GenerateTokenRequest struct {
	Fingerprint string `json:"fingerprint" example:"f1a2b3c4d5"` // Fingerprint do browser (opcional)
	Kiosk       bool   `json:"kiosk"`                            // Se true, indica dispositivo compartilhado (totem)
}

// SubmitRespostasRequest representa requisição de submissão de respostas com token
type SubmitRespostasRequest struct {
	TokenAcesso string                  `json:"token_acesso" example:"tok_abc123def456"` // Token obtido via GenerateToken
	Respostas   []RespostaCreateRequest `json:"respostas"`                               // Lista de respostas da pesquisa
}
