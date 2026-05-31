import api from "./api";
import type { Ciclo } from "../types";

export const cicloService = {
  listByEmpresa: async (empresaId: number): Promise<Ciclo[]> => {
    // A rota GET /api/v1/ciclos recupera os ciclos da empresa (o backend extrai empresa_id do token context, mas passamos na URL ou mantemos a assinatura por padrao)
    const response = await api.get<{ success: boolean; data: Ciclo[] }>(
      "/ciclos"
    );
    return response.data.data;
  },

  create: async (empresaId: number, data: { nome: string; recorrencia?: string }): Promise<Ciclo> => {
    const response = await api.post<{ success: boolean; data: Ciclo }>(
      "/ciclos",
      data
    );
    return response.data.data;
  },

  update: async (id: number, data: { nome: string; recorrencia?: string }): Promise<void> => {
    await api.put(`/ciclos/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/ciclos/${id}`);
  },
};
