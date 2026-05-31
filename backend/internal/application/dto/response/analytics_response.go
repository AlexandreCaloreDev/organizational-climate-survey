// Package response contém structs usadas para enviar dados da API como respostas.
package response

// AnalyticsFilterRequest representa os filtros aplicáveis ao relatório analítico avançado.
type AnalyticsFilterRequest struct {
	IDEmpresa int     `json:"id_empresa" form:"id_empresa" binding:"required"`
	IDSetor   *int    `json:"id_setor" form:"id_setor"`
	Ciclo     *string `json:"ciclo" form:"ciclo"`
}

// AnalyticsKPI representa um indicador chave de performance (ex: Demanda de Trabalho).
type AnalyticsKPI struct {
	Categoria     string  `json:"categoria" example:"Demanda de Trabalho"`
	Score         float64 `json:"score" example:"85.5"`
	DeltaAnterior float64 `json:"delta_anterior" example:"-2.1"` // Diferença em relação ao ciclo anterior
}

// HeatmapData mapeia pontuações por dimensão/categoria focadas em um setor específico (Cenário A).
type HeatmapData struct {
	Setor     string             `json:"setor" example:"Recursos Humanos"`
	Dimensoes map[string]float64 `json:"dimensoes" example:"{\"Demanda de Trabalho\": 80, \"Autonomia\": 65}"`
}

// LineChartData representa a evolução histórica de métricas através dos ciclos (Cenário B).
type LineChartData struct {
	Ciclo     string             `json:"ciclo" example:"2026.1"`
	Dimensoes map[string]float64 `json:"dimensoes" example:"{\"Apoio da Chefia\": 70, \"Autonomia\": 85}"`
}

// ActionPlan representa riscos identificados e planos de ação propostos.
type ActionPlan struct {
	Risco        string  `json:"risco" example:"Alta sobrecarga de tarefas"`
	Recomendacao string  `json:"recomendacao" example:"Revisão de processos operacionais e distribuição de tarefas"`
	Setor        *string `json:"setor,omitempty" example:"Operações"` // Presente quando no Cenário A
}

// RelatorioAnalyticsResponse é a resposta principal contendo todos os dados do relatório analítico.
type RelatorioAnalyticsResponse struct {
	KPIs         []AnalyticsKPI  `json:"kpis"`
	Radar        []interface{}   `json:"radar,omitempty"`    // Cenário A. Usa interface{} para serializar keys dinâmicas dos setores.
	Heatmap      []HeatmapData   `json:"heatmap,omitempty"`  // Cenário A.
	Evolucao     []LineChartData `json:"evolucao,omitempty"` // Cenário B.
	PlanosDeAcao []ActionPlan    `json:"planos_de_acao"`
}
