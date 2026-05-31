package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"organizational-climate-survey/backend/internal/application/dto/response"
)

type AnalyticsRepository struct {
	db *pgxpool.Pool
}

func NewAnalyticsRepository(db *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

// GetScoresGlobaisPorCiclo calcula as médias da empresa agrupadas por categoria,
// simulando a categoria a partir do tipo_pergunta ou assumindo uma coluna existente.
func (r *AnalyticsRepository) GetScoresGlobaisPorCiclo(ctx context.Context, idEmpresa int, ciclo string) ([]response.AnalyticsKPI, error) {
	query := `
		SELECT 
			p.tipo_pergunta AS categoria, 
			AVG(CAST(r.valor_resposta AS FLOAT)) * 20 AS score -- Exemplo: escala 1-5 convertida para 0-100
		FROM resposta r
		JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		JOIN pesquisa pesq ON p.id_pesquisa = pesq.id_pesquisa
		JOIN submissao_pesquisa sp ON r.id_submissao = sp.id_submissao
		WHERE pesq.id_empresa = $1 
		  AND ($2 = 'todos' OR pesq.titulo ILIKE '%' || $2 || '%')
		  AND sp.status = 'completa'
		  AND r.valor_resposta ~ '^[0-9\.]+$'
		GROUP BY p.tipo_pergunta
	`
	rows, err := r.db.Query(ctx, query, idEmpresa, ciclo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var kpis []response.AnalyticsKPI
	for rows.Next() {
		var kpi response.AnalyticsKPI
		if err := rows.Scan(&kpi.Categoria, &kpi.Score); err != nil {
			return nil, err
		}
		// Delta seria calculado com uma subquery para o ciclo anterior, aqui deixamos 0 como padrão inicial
		kpi.DeltaAnterior = 0
		kpis = append(kpis, kpi)
	}

	return kpis, nil
}

func (r *AnalyticsRepository) GetRadarSetores(ctx context.Context, idEmpresa int, ciclo string) ([]map[string]interface{}, error) {
	// Exemplo de query dinâmica crosstab seria complexa. Vamos retornar um mapa estático baseado numa query simples
	// Na prática, faríamos um group by Setor e Categoria, e transformaríamos em Go.
	query := `
		SELECT 
			s.nome_setor,
			p.tipo_pergunta AS categoria, 
			AVG(CAST(r.valor_resposta AS FLOAT)) * 20 AS score
		FROM resposta r
		JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		JOIN pesquisa pesq ON p.id_pesquisa = pesq.id_pesquisa
		JOIN submissao_pesquisa sp ON r.id_submissao = sp.id_submissao
		JOIN setor s ON pesq.id_setor = s.id_setor
		WHERE pesq.id_empresa = $1 
		  AND ($2 = 'todos' OR pesq.titulo ILIKE '%' || $2 || '%')
		  AND sp.status = 'completa'
		  AND r.valor_resposta ~ '^[0-9\.]+$'
		GROUP BY s.nome_setor, p.tipo_pergunta
	`
	rows, err := r.db.Query(ctx, query, idEmpresa, ciclo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Agrupando em Go para formato flat do Radar
	radarMap := make(map[string]map[string]interface{})
	for rows.Next() {
		var setor, categoria string
		var score float64
		if err := rows.Scan(&setor, &categoria, &score); err != nil {
			return nil, err
		}

		if _, exists := radarMap[categoria]; !exists {
			radarMap[categoria] = map[string]interface{}{"categoria": categoria}
		}
		radarMap[categoria][setor] = score
	}

	var result []map[string]interface{}
	for _, v := range radarMap {
		result = append(result, v)
	}
	return result, nil
}

func (r *AnalyticsRepository) GetHeatmapGlobal(ctx context.Context, idEmpresa int, ciclo string) ([]response.HeatmapData, error) {
	query := `
		SELECT 
			s.nome_setor,
			p.tipo_pergunta AS categoria, 
			AVG(CAST(r.valor_resposta AS FLOAT)) * 20 AS score
		FROM resposta r
		JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		JOIN pesquisa pesq ON p.id_pesquisa = pesq.id_pesquisa
		JOIN submissao_pesquisa sp ON r.id_submissao = sp.id_submissao
		JOIN setor s ON pesq.id_setor = s.id_setor
		WHERE pesq.id_empresa = $1 
		  AND ($2 = 'todos' OR pesq.titulo ILIKE '%' || $2 || '%')
		  AND sp.status = 'completa'
		  AND r.valor_resposta ~ '^[0-9\.]+$'
		GROUP BY s.nome_setor, p.tipo_pergunta
	`
	rows, err := r.db.Query(ctx, query, idEmpresa, ciclo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	heatmapMap := make(map[string]response.HeatmapData)
	for rows.Next() {
		var setor, categoria string
		var score float64
		if err := rows.Scan(&setor, &categoria, &score); err != nil {
			return nil, err
		}

		hd, exists := heatmapMap[setor]
		if !exists {
			hd = response.HeatmapData{
				Setor:     setor,
				Dimensoes: make(map[string]float64),
			}
		}
		hd.Dimensoes[categoria] = score
		heatmapMap[setor] = hd
	}

	var result []response.HeatmapData
	for _, v := range heatmapMap {
		result = append(result, v)
	}
	return result, nil
}

func (r *AnalyticsRepository) GetRiscosGlobais(ctx context.Context, idEmpresa int, ciclo string) ([]response.ActionPlan, error) {
	query := `
		SELECT 
			p.tipo_pergunta AS risco, 
			'Ação mitigatória recomendada para a dimensão afetada' AS recomendacao
		FROM resposta r
		JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		JOIN pesquisa pesq ON p.id_pesquisa = pesq.id_pesquisa
		JOIN submissao_pesquisa sp ON r.id_submissao = sp.id_submissao
		WHERE pesq.id_empresa = $1 
		  AND ($2 = 'todos' OR pesq.titulo ILIKE '%' || $2 || '%')
		  AND sp.status = 'completa'
		  AND r.valor_resposta ~ '^[0-9\.]+$'
		GROUP BY p.tipo_pergunta
		HAVING AVG(CAST(r.valor_resposta AS FLOAT)) * 20 < 60
		LIMIT 5
	`
	rows, err := r.db.Query(ctx, query, idEmpresa, ciclo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var planos []response.ActionPlan
	for rows.Next() {
		var plan response.ActionPlan
		if err := rows.Scan(&plan.Risco, &plan.Recomendacao); err != nil {
			return nil, err
		}
		planos = append(planos, plan)
	}
	return planos, nil
}

func (r *AnalyticsRepository) GetScoresSetorPorCiclo(ctx context.Context, idEmpresa int, idSetor int, ciclo string) ([]response.AnalyticsKPI, error) {
	query := `
		SELECT 
			p.tipo_pergunta AS categoria, 
			AVG(CAST(r.valor_resposta AS FLOAT)) * 20 AS score
		FROM resposta r
		JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		JOIN pesquisa pesq ON p.id_pesquisa = pesq.id_pesquisa
		JOIN submissao_pesquisa sp ON r.id_submissao = sp.id_submissao
		WHERE pesq.id_empresa = $1 
		  AND pesq.id_setor = $2
		  AND ($3 = 'todos' OR pesq.titulo ILIKE '%' || $3 || '%')
		  AND sp.status = 'completa'
		  AND r.valor_resposta ~ '^[0-9\.]+$'
		GROUP BY p.tipo_pergunta
	`
	rows, err := r.db.Query(ctx, query, idEmpresa, idSetor, ciclo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var kpis []response.AnalyticsKPI
	for rows.Next() {
		var kpi response.AnalyticsKPI
		if err := rows.Scan(&kpi.Categoria, &kpi.Score); err != nil {
			return nil, err
		}
		kpis = append(kpis, kpi)
	}
	return kpis, nil
}

func (r *AnalyticsRepository) GetHistoricoSetor(ctx context.Context, idEmpresa int, idSetor int) ([]response.LineChartData, error) {
	query := `
		SELECT 
			pesq.titulo AS ciclo,
			p.tipo_pergunta AS categoria, 
			AVG(CAST(r.valor_resposta AS FLOAT)) * 20 AS score
		FROM resposta r
		JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		JOIN pesquisa pesq ON p.id_pesquisa = pesq.id_pesquisa
		JOIN submissao_pesquisa sp ON r.id_submissao = sp.id_submissao
		WHERE pesq.id_empresa = $1 
		  AND pesq.id_setor = $2
		  AND sp.status = 'completa'
		  AND r.valor_resposta ~ '^[0-9\.]+$'
		GROUP BY pesq.titulo, p.tipo_pergunta
		ORDER BY pesq.titulo ASC
	`
	rows, err := r.db.Query(ctx, query, idEmpresa, idSetor)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	evolucaoMap := make(map[string]response.LineChartData)
	for rows.Next() {
		var ciclo, categoria string
		var score float64
		if err := rows.Scan(&ciclo, &categoria, &score); err != nil {
			return nil, err
		}

		lcd, exists := evolucaoMap[ciclo]
		if !exists {
			lcd = response.LineChartData{
				Ciclo:     ciclo,
				Dimensoes: make(map[string]float64),
			}
		}
		lcd.Dimensoes[categoria] = score
		evolucaoMap[ciclo] = lcd
	}

	var result []response.LineChartData
	for _, v := range evolucaoMap {
		result = append(result, v)
	}
	return result, nil
}

func (r *AnalyticsRepository) GetHistoricoEmpresaGlobal(ctx context.Context, idEmpresa int) ([]response.LineChartData, error) {
	query := `
		SELECT 
			pesq.titulo AS ciclo,
			p.tipo_pergunta AS categoria, 
			AVG(CAST(r.valor_resposta AS FLOAT)) * 20 AS score
		FROM resposta r
		JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		JOIN pesquisa pesq ON p.id_pesquisa = pesq.id_pesquisa
		JOIN submissao_pesquisa sp ON r.id_submissao = sp.id_submissao
		WHERE pesq.id_empresa = $1 
		  AND sp.status = 'completa'
		  AND r.valor_resposta ~ '^[0-9\.]+$'
		GROUP BY pesq.titulo, p.tipo_pergunta
		ORDER BY pesq.titulo ASC
	`
	rows, err := r.db.Query(ctx, query, idEmpresa)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	evolucaoMap := make(map[string]response.LineChartData)
	for rows.Next() {
		var ciclo, categoria string
		var score float64
		if err := rows.Scan(&ciclo, &categoria, &score); err != nil {
			return nil, err
		}

		lcd, exists := evolucaoMap[ciclo]
		if !exists {
			lcd = response.LineChartData{
				Ciclo:     ciclo,
				Dimensoes: make(map[string]float64),
			}
		}
		lcd.Dimensoes[categoria] = score
		evolucaoMap[ciclo] = lcd
	}

	var result []response.LineChartData
	for _, v := range evolucaoMap {
		result = append(result, v)
	}
	return result, nil
}

func (r *AnalyticsRepository) GetRiscosSetor(ctx context.Context, idEmpresa int, idSetor int, ciclo string) ([]response.ActionPlan, error) {
	query := `
		SELECT 
			p.tipo_pergunta AS risco, 
			'Focar em melhorias específicas no setor' AS recomendacao
		FROM resposta r
		JOIN pergunta p ON r.id_pergunta = p.id_pergunta
		JOIN pesquisa pesq ON p.id_pesquisa = pesq.id_pesquisa
		JOIN submissao_pesquisa sp ON r.id_submissao = sp.id_submissao
		WHERE pesq.id_empresa = $1 
		  AND pesq.id_setor = $2
		  AND ($3 = 'todos' OR pesq.titulo ILIKE '%' || $3 || '%')
		  AND sp.status = 'completa'
		  AND r.valor_resposta ~ '^[0-9\.]+$'
		GROUP BY p.tipo_pergunta
		HAVING AVG(CAST(r.valor_resposta AS FLOAT)) * 20 < 60
		LIMIT 5
	`
	rows, err := r.db.Query(ctx, query, idEmpresa, idSetor, ciclo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var planos []response.ActionPlan
	for rows.Next() {
		var plan response.ActionPlan
		if err := rows.Scan(&plan.Risco, &plan.Recomendacao); err != nil {
			return nil, err
		}
		planos = append(planos, plan)
	}
	return planos, nil
}

// Métodos legados da interface AnalyticsRepository que não usamos na nova feature
func (r *AnalyticsRepository) GetPesquisaMetrics(ctx context.Context, pesquisaID int) (map[string]interface{}, error) {
	return nil, nil
}
func (r *AnalyticsRepository) GetComparisonData(ctx context.Context, pesquisaIDs []int) (map[string]interface{}, error) {
	return nil, nil
}
func (r *AnalyticsRepository) GetSetorComparison(ctx context.Context, empresaID int, pesquisaID int) (map[string]interface{}, error) {
	return nil, nil
}
