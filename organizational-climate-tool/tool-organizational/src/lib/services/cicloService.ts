import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { Ciclo } from "../types";

export const cicloService = {
  listByEmpresa: async (empresaId: number): Promise<Ciclo[]> => {
    return apiGet<Ciclo[]>("/ciclos");
  },

  create: async (empresaId: number, data: { nome: string; recorrencia?: string }): Promise<Ciclo> => {
    return apiPost<Ciclo>("/ciclos", data);
  },

  update: async (id: number, data: { nome: string; recorrencia?: string }): Promise<void> => {
    await apiPut(`/ciclos/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await apiDelete(`/ciclos/${id}`);
  },
};
