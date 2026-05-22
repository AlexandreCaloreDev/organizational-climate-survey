import { apiGet, apiPost, apiDelete } from '@/lib/api';
import type { Resposta, SubmitRespostaRequest } from '@/lib/types';

export const respostaService = {
  submit(data: SubmitRespostaRequest): Promise<void> {
    return apiPost('/respostas/submit', data);
  },

  getStatsByPesquisa(pesquisaId: number): Promise<unknown> {
    return apiGet(`/pesquisas/${pesquisaId}/respostas/stats`);
  },

  getAggregatedByPesquisa(pesquisaId: number): Promise<Resposta[]> {
    return apiGet<Resposta[]>(`/pesquisas/${pesquisaId}/respostas/aggregated`);
  },

  countByPesquisa(pesquisaId: number): Promise<{ pesquisa_id: number; total_respostas: number }> {
    return apiGet<{ pesquisa_id: number; total_respostas: number }>(`/pesquisas/${pesquisaId}/respostas/count`);
  },

  getByDateRange(pesquisaId: number, startDate: string, endDate: string): Promise<Resposta[]> {
    return apiGet<Resposta[]>(`/pesquisas/${pesquisaId}/respostas/by-date`, { start_date: startDate, end_date: endDate });
  },

  deleteByPesquisa(pesquisaId: number): Promise<void> {
    return apiDelete(`/pesquisas/${pesquisaId}/respostas`);
  },
};
