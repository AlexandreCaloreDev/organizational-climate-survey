import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { Dashboard, DashboardData, MetricaPorPergunta } from '@/lib/types';

export const dashboardService = {
  getByPesquisa(pesquisaId: number): Promise<Dashboard> {
    return apiGet<Dashboard>(`/pesquisas/${pesquisaId}/dashboard`);
  },

  getById(id: number): Promise<Dashboard> {
    return apiGet<Dashboard>(`/dashboards/${id}`);
  },

  getData(id: number): Promise<DashboardData> {
    return apiGet<DashboardData>(`/dashboards/${id}/data`);
  },

  listByEmpresa(empresaId: number): Promise<Dashboard[]> {
    return apiGet<Dashboard[]>(`/empresas/${empresaId}/dashboards`);
  },

  create(pesquisaId: number, titulo: string): Promise<Dashboard> {
    return apiPost<Dashboard>('/dashboards', { id_pesquisa: pesquisaId, titulo });
  },

  update(id: number, data: Partial<Dashboard>): Promise<Dashboard> {
    return apiPut<Dashboard>(`/dashboards/${id}`, data);
  },

  async getEmpresaDashboardData(empresaId: number, startDate?: string, endDate?: string): Promise<DashboardData> {
    try {
      // Busca todas as pesquisas da empresa
      const pesquisas = await apiGet<any[]>(`/empresas/${empresaId}/pesquisas`);
      
      let totalRespostas = 0;
      let perguntasGlobais: MetricaPorPergunta[] = [];
      let totalTaxa = 0;
      let countPesquisas = 0;
      
      let sumNps = 0;
      let countNpsQuestions = 0;
      
      // Itera por todas as pesquisas para agregar as estatísticas
      for (const p of pesquisas || []) {
        const idPesquisa = p.id_pesquisa || p.id;
        if (!idPesquisa) continue;
        
        // Pega os stats de cada pesquisa — ignora silenciosamente se falhar (pesquisa sem respostas)
        try {
          let stats: Record<string, Record<string, number>> = {};
          try {
            const queryParams = startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : '';
            stats = await apiGet<Record<string, Record<string, number>>>(`/pesquisas/${idPesquisa}/respostas/stats${queryParams}`);
          } catch {
            // Pesquisa sem respostas retorna 500 — normal, prosseguimos com stats vazio
          }
          const perguntas = await apiGet<any[]>(`/pesquisas/${idPesquisa}/perguntas`);
          
          let respNaPesquisa = 0;
          let somaMedias = 0;
          let qtdMedias = 0;
          
          perguntas?.forEach(pergunta => {
            const qId = String(pergunta.id_pergunta);
            const dist = stats[qId] || {};
            
            let respostasNestaPergunta = 0;
            let somaValores = 0;
            let promoters = 0;
            let detractors = 0;
            let totalScaleAnswers = 0;
            
            Object.entries(dist).forEach(([val, count]) => {
              const qty = Number(count);
              respostasNestaPergunta += qty;
              if (pergunta.tipo_pergunta === 'EscalaNumerica') {
                somaValores += Number(val) * qty;
                const note = Number(val);
                totalScaleAnswers += qty;
                if (note >= 9) {
                  promoters += qty;
                } else if (note <= 6) {
                  detractors += qty;
                }
              }
            });
            
            if (respostasNestaPergunta > respNaPesquisa) {
              respNaPesquisa = respostasNestaPergunta;
            }
            
            let media = undefined;
            if (pergunta.tipo_pergunta === 'EscalaNumerica' && respostasNestaPergunta > 0) {
              media = somaValores / respostasNestaPergunta;
              somaMedias += media;
              qtdMedias++;
              
              if (totalScaleAnswers > 0) {
                const nps = ((promoters - detractors) / totalScaleAnswers) * 100;
                sumNps += nps;
                countNpsQuestions++;
              }
            }
            
            perguntasGlobais.push({
              id_pergunta: pergunta.id_pergunta,
              texto_pergunta: pergunta.texto_pergunta,
              tipo_pergunta: pergunta.tipo_pergunta,
              media: media,
              distribuicao: dist,
              total_respostas: respostasNestaPergunta
            });
          });
          
          totalRespostas += respNaPesquisa;
          
          // Participação mockada simples (em um sistema real, seria Resp/TotalFuncionarios do Setor)
          // Usaremos o total de respostas como % para fins de engajamento do gráfico
          const participacao = respNaPesquisa > 0 ? Math.min(100, Math.round((respNaPesquisa / (p.participantes || respNaPesquisa || 1)) * 100)) : 0;
          totalTaxa += participacao;
          countPesquisas++;
          
        } catch (e) {
          console.warn("Erro ao buscar stats da pesquisa", idPesquisa);
        }
      }
      
      const taxa_participacao = countPesquisas > 0 ? Math.round(totalTaxa / countPesquisas) : 0;
      const nps_geral = countNpsQuestions > 0 ? Math.round(sumNps / countNpsQuestions) : undefined;
      
      return {
        total_respostas: totalRespostas,
        taxa_participacao,
        metricas_por_pergunta: perguntasGlobais,
        nps_geral
      };
      
    } catch (err) {
      console.error(err);
      return {
        total_respostas: 0,
        taxa_participacao: 0,
        metricas_por_pergunta: []
      };
    }
  },

  delete(id: number): Promise<void> {
    return apiDelete(`/dashboards/${id}`);
  },
};
