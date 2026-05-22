import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { Pergunta, CreatePerguntaRequest } from '@/lib/types';

export const perguntaService = {
  listByPesquisa(pesquisaId: number): Promise<Pergunta[]> {
    return apiGet<Pergunta[]>(`/pesquisas/${pesquisaId}/perguntas`);
  },

  getById(id: number): Promise<Pergunta> {
    return apiGet<Pergunta>(`/perguntas/${id}`);
  },

  create(pesquisaId: number, data: CreatePerguntaRequest): Promise<Pergunta> {
    return apiPost<Pergunta>('/perguntas', { ...data, id_pesquisa: pesquisaId });
  },

  createBatch(pesquisaId: number, perguntas: CreatePerguntaRequest[]): Promise<Pergunta[]> {
    const payload = perguntas.map(p => ({ ...p, id_pesquisa: pesquisaId }));
    return apiPost<Pergunta[]>('/perguntas/batch', payload);
  },

  update(id: number, data: Partial<CreatePerguntaRequest>): Promise<Pergunta> {
    return apiPut<Pergunta>(`/perguntas/${id}`, data);
  },

  updateOrdem(id: number, ordem: number): Promise<Pergunta> {
    return apiPut<Pergunta>(`/perguntas/${id}/ordem`, { ordem_exibicao: ordem });
  },

  reorder(pesquisaId: number, ordem: Array<{ id: number; ordem: number }>): Promise<void> {
    return apiPut(`/pesquisas/${pesquisaId}/perguntas/reorder`, { ordem });
  },

  delete(id: number): Promise<void> {
    return apiDelete(`/perguntas/${id}`);
  },
};
